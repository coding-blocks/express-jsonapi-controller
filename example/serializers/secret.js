const { utils } = require('../../')

module.exports = (included, type, config) => {
  const includedConfig = utils.getIncludedSerializerConfig(included)

  if (type === 'deserialize') {
    return {
      keyForAttribute: 'snake_case',
      user: {
        valueForRelationship (relationship) {
          return {
            id: relationship.id
          }
        }
      }
    }
  }

  return {
    attributes: ['text', 'user'],
    user: {
      ref: 'id',
      included: true
    },
    ...config,
    ...includedConfig
  }
}
