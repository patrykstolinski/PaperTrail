import "dotenv/config";
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import Document from '../../models/Document.js';
import { computeFileHash } from '../../utils/hashHelpers.js';

async function connect() {
  const { MONGO_USER, MONGO_PASS, MONGO_DB, MONGO_PORT, MONGO_HOST } = process.env;
  const mongoURI = `mongodb://${MONGO_USER}:${MONGO_PASS}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}?authSource=admin`;
  await mongoose.connect(mongoURI, { });
}

async function run() {
  try {
    await connect();
    console.log('Connected to Mongo for integration test');

    // Create two fake ObjectId strings for users
    const userA = new mongoose.Types.ObjectId();
    const userB = new mongoose.Types.ObjectId();

    // small sample buffer
    const sample = Buffer.from('integration-test-sample', 'utf8');

    // prepare docs
    const docA = new Document({
      userId: userA,
      title: 'test-doc',
      titleHash: computeFileHash('test-doc') || null,
      fileHash: computeFileHash(sample, userA.toString()),
      fileType: 'application/pdf',
      originalFileName: 'sample.pdf',
      fileBinaryData: sample,
      fileSize: sample.length,
    });

    // Save first doc for userA
    await docA.save();
    console.log('Saved doc for userA');

    // Attempt to save same file for same user -> should violate unique_file_per_user
    const docAdup = new Document({
      userId: userA,
      title: 'test-doc-dup',
      titleHash: computeFileHash('test-doc-dup') || null,
      fileHash: computeFileHash(sample, userA.toString()),
      fileType: 'application/pdf',
      originalFileName: 'sample2.pdf',
      fileBinaryData: sample,
      fileSize: sample.length,
    });

    try {
      await docAdup.save();
      console.error('ERROR: duplicate insert for same user succeeded unexpectedly');
      process.exit(2);
    } catch (err) {
      if (err.code === 11000) {
        console.log('Duplicate correctly rejected for same user (unique index)');
      } else {
        console.error('Unexpected error on duplicate insert:', err);
        process.exit(3);
      }
    }

    // Insert same file for different user -> should succeed
    const docB = new Document({
      userId: userB,
      title: 'test-doc-userB',
      titleHash: computeFileHash('test-doc-userB') || null,
      fileHash: computeFileHash(sample, userB.toString()),
      fileType: 'application/pdf',
      originalFileName: 'sample.pdf',
      fileBinaryData: sample,
      fileSize: sample.length,
    });

    await docB.save();
    console.log('Saved doc for userB (same file content, different user)');

    // cleanup
    await Document.deleteMany({ originalFileName: /sample/ });
    console.log('Cleaned up test documents');
    await mongoose.disconnect();
    console.log('Disconnected');
    console.log('Integration test PASSED');
  } catch (err) {
    console.error('Integration test FAILED', err);
    try { await mongoose.disconnect(); } catch (e) {}
    process.exit(1);
  }
}

run();
