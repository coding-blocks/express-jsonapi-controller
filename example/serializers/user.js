// const { util } = require('../../')

module.exports = (included, config) => {
  return {
    attributes: ['firstName', 'lastName'],
    ...config
  };
};
