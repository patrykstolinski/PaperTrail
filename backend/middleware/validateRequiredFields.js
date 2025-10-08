export const validateRequiredFields = (requiredFields) => {
    return (req, res, next) => {
        const missingFields = requiredFields.filter(
            (field) => !req.body[field] && req.body[field] !==0
        );
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                error: `Missing required field(s): ${missingFields.join(", ")}`,
            });
        }
        next();
    };
};