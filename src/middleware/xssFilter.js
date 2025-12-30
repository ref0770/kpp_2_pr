const validator = require('validator');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

const xssFilterOutput = (req, res, next) => {
  const originalJson = res.json;
  res.json = function(data) {
    if (data && typeof data === 'object') {
      const sanitizeData = (obj) => {
        if (!obj) return obj;
        if (typeof obj === 'string') {
          return DOMPurify.sanitize(obj, {
            ALLOWED_TAGS: [],
            ALLOWED_ATTR: []
          });
        }
        if (Array.isArray(obj)) {
          return obj.map(item => sanitizeData(item));
        }
        if (typeof obj === 'object' && obj !== null) {
          const sanitized = {};
          for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
              sanitized[key] = sanitizeData(obj[key]);
            }
          }
          return sanitized;
        }
        return obj;
      };
      data = sanitizeData(data);
    }
    originalJson.call(this, data);
  };
  next();
};

const validateContentType = (req, res, next) => {
  const allowedContentTypes = ['application/json', 'application/x-www-form-urlencoded'];
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const contentType = req.headers['content-type'];
    if (!contentType || !allowedContentTypes.some(type => contentType.includes(type))) {
      return res.status(415).json({
        success: false,
        message: 'Непідтримуваний тип контенту'
      });
    }
  }
  next();
};

module.exports = {
  xssFilterOutput,
  validateContentType
};