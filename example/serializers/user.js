// const { util } = require('../../')

module.exports = (included, type, config) => {
  return {
    attributes: ['firstName', 'lastName'],
    ...config
  };
};
