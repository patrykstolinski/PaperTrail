import Document from "../models/Document.js";
import Folder from "../models/Folder.js";
import mongoose from "mongoose";

/**
 * Unified search across documents and folders
 * GET /api/search?q=<query>&type=<all|documents|folders>&tags=<tags>&folderId=<id>&page=<n>&pageSize=<n>
 */
export const unifiedSearch = async (req, res) => {
    try {
        const ownerId = req.user?.id;
        if (!ownerId) return res.status(401).json({ success: false, error: "Missing authenticated user" });

        console.log('[SEARCH DEBUG] Owner ID:', ownerId);
        console.log('[SEARCH DEBUG] Owner ID type:', typeof ownerId);
        
        // Convert to ObjectId if it's a string
        const ownerObjectId = mongoose.Types.ObjectId.isValid(ownerId) 
            ? new mongoose.Types.ObjectId(ownerId) 
            : ownerId;
        
        console.log('[SEARCH DEBUG] Owner ObjectId:', ownerObjectId);
        console.log('[SEARCH DEBUG] Owner ObjectId type:', typeof ownerObjectId);

        const { 
            q, 
            type = 'all', // 'all', 'documents', 'folders'
            tags, 
            folderId, 
            page = 1, 
            pageSize = 20 
        } = req.query;

        const results = {
            documents: [],
            folders: []
        };

        const meta = {
            totalDocuments: 0,
            totalFolders: 0,
            totalCount: 0,
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            totalPages: 0
        };

        // Search documents if type is 'all' or 'documents'
        if (type === 'all' || type === 'documents') {
            const docFilter = { userId: ownerObjectId };
            
            console.log('[SEARCH DEBUG] Search query:', q);
            console.log('[SEARCH DEBUG] Type filter:', type);
            
            // Folder filtering
            if (folderId && mongoose.Types.ObjectId.isValid(folderId)) {
                docFilter.folderId = folderId;
            }

            // Tag filtering (AND logic)
            if (tags) {
                const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);
                if (tagArray.length > 0) {
                    docFilter.tags = { $all: tagArray };
                }
            }

            // Build aggregation pipeline for document search
            const docPipeline = [];
            
            // Match basic filters first
            docPipeline.push({ $match: docFilter });
            console.log('[SEARCH DEBUG] Base filter:', JSON.stringify(docFilter));

            // Add search filter if query provided
            if (q && q.trim()) {
                const searchTerm = q.trim();
                
                docPipeline.push({
                    $match: {
                        $or: [
                            // Search in text fields using $regex operator (NOT RegExp object)
                            { title: { $regex: searchTerm, $options: 'i' } },
                            { tags: { $elemMatch: { $regex: searchTerm, $options: 'i' } } },
                            { originalFileName: { $regex: searchTerm, $options: 'i' } },
                            // Search in extractedFields using $expr (only if extractedFields exists and is an object)
                            {
                                $and: [
                                    { extractedFields: { $exists: true, $ne: null, $type: "object" } },
                                    {
                                        $expr: {
                                            $gt: [
                                                {
                                                    $size: {
                                                        $filter: {
                                                            input: { 
                                                                $ifNull: [
                                                                    { $objectToArray: "$extractedFields" },
                                                                    []
                                                                ]
                                                            },
                                                            as: "field",
                                                            cond: {
                                                                $or: [
                                                                    { $regexMatch: { input: "$$field.k", regex: searchTerm, options: "i" } },
                                                                    { $regexMatch: { input: { $toString: "$$field.v" }, regex: searchTerm, options: "i" } }
                                                                ]
                                                            }
                                                        }
                                                    }
                                                },
                                                0
                                            ]
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                });
            }

            // Get total count using aggregation
            const countPipeline = [...docPipeline, { $count: "total" }];
            console.log('[SEARCH DEBUG] Count pipeline:', JSON.stringify(countPipeline, null, 2));
            const countResult = await Document.aggregate(countPipeline);
            console.log('[SEARCH DEBUG] Count result:', countResult);
            meta.totalDocuments = countResult.length > 0 ? countResult[0].total : 0;
            console.log('[SEARCH DEBUG] Total documents found:', meta.totalDocuments);
            
            // Fetch documents
            if (type === 'documents') {
                // When searching only documents, apply pagination
                const paginatedPipeline = [
                    ...docPipeline,
                    { $project: { fileBinaryData: 0 } }, // Exclude binary data
                    { $sort: { createdAt: -1 } },
                    { $skip: (parseInt(page) - 1) * parseInt(pageSize) },
                    { $limit: parseInt(pageSize) }
                ];
                results.documents = await Document.aggregate(paginatedPipeline);
            } else {
                // When searching all, fetch all matching documents
                const allDocsPipeline = [
                    ...docPipeline,
                    { $project: { fileBinaryData: 0 } },
                    { $sort: { createdAt: -1 } }
                ];
                results.documents = await Document.aggregate(allDocsPipeline);
            }
        }

        // Search folders if type is 'all' or 'folders'
        if (type === 'all' || type === 'folders') {
            const folderFilter = { userId: ownerObjectId };

            // Build aggregation pipeline for folders
            const folderPipeline = [{ $match: folderFilter }];

            // Add search filter if query provided
            if (q && q.trim()) {
                const searchTerm = q.trim();
                
                folderPipeline.push({
                    $match: {
                        $or: [
                            { name: { $regex: searchTerm, $options: 'i' } },
                            { description: { $regex: searchTerm, $options: 'i' } },
                            { slug: { $regex: searchTerm, $options: 'i' } }
                        ]
                    }
                });
            }

            // Get total count
            const folderCountPipeline = [...folderPipeline, { $count: "total" }];
            const folderCountResult = await Folder.aggregate(folderCountPipeline);
            meta.totalFolders = folderCountResult.length > 0 ? folderCountResult[0].total : 0;

            // Add document count lookup
            folderPipeline.push(
                {
                    $lookup: {
                        from: 'documents',
                        localField: '_id',
                        foreignField: 'folderId',
                        as: 'docs'
                    }
                },
                {
                    $project: {
                        _id: 1,
                        userId: 1,
                        name: 1,
                        slug: 1,
                        description: 1,
                        color: 1,
                        parentId: 1,
                        archived: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        documentCount: { $size: '$docs' }
                    }
                },
                { $sort: { createdAt: -1 } }
            );

            // Fetch folders with document counts
            if (type === 'folders') {
                // When searching only folders, apply pagination
                folderPipeline.push(
                    { $skip: (parseInt(page) - 1) * parseInt(pageSize) },
                    { $limit: parseInt(pageSize) }
                );
            }
            
            results.folders = await Folder.aggregate(folderPipeline);
        }

        // For type='all', combine and paginate results
        if (type === 'all') {
            // Add type discriminator to each result
            const documentsWithType = results.documents.map(doc => ({ ...doc, resultType: 'document' }));
            const foldersWithType = results.folders.map(folder => ({ ...folder, resultType: 'folder' }));
            
            // Combine and sort by createdAt (most recent first)
            const combined = [...documentsWithType, ...foldersWithType]
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            // Apply pagination to combined results
            const startIdx = (parseInt(page) - 1) * parseInt(pageSize);
            const endIdx = startIdx + parseInt(pageSize);
            const paginatedCombined = combined.slice(startIdx, endIdx);

            // Separate back into documents and folders for response
            results.documents = paginatedCombined.filter(item => item.resultType === 'document');
            results.folders = paginatedCombined.filter(item => item.resultType === 'folder');
            
            // Remove resultType before sending response
            results.documents = results.documents.map(({ resultType, ...doc }) => doc);
            results.folders = results.folders.map(({ resultType, ...folder }) => folder);

            meta.totalCount = meta.totalDocuments + meta.totalFolders;
            meta.totalPages = Math.ceil(meta.totalCount / parseInt(pageSize));
        } else if (type === 'documents') {
            meta.totalCount = meta.totalDocuments;
            meta.totalPages = Math.ceil(meta.totalDocuments / parseInt(pageSize));
        } else if (type === 'folders') {
            meta.totalCount = meta.totalFolders;
            meta.totalPages = Math.ceil(meta.totalFolders / parseInt(pageSize));
        }

        res.json({
            success: true,
            data: results,
            meta
        });
    } catch (err) {
        console.error("Error in unified search:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};
