const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const data =
      source === 'body'
        ? req.body
        : source === 'query'
          ? req.query
          : req.params;
    const result = schema.safeParse(data);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      return res.status(400).json({
        message: 'Validation failed',
        errors,
      });
    }

    if (source === 'body') req.validatedBody = result.data;
    else if (source === 'query') req.validatedQuery = result.data;
    else req.validatedParams = result.data;
    next();
  };
};

module.exports = validate;
