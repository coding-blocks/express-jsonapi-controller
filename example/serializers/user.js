const { utils } = require('../../')

module.exports = (included, type, config) => {
  const includedConfig = utils.getIncludedSerializerConfig(included)

  if (type === 'deserialize') {
    return {
      keyForAttribute: 'snake_case',
      secrets: {
        valueForRelationship (relationship) {
          return {
            id: relationship.id
          }
        }
      }
    }
  }

  return {
    attributes: ['firstName', 'lastName', 'secrets'],
    secrets: {
      ref: 'id',
      included: true
    },
    ...config,
    ...includedConfig
  }
}
