const I = require('i')();
const R = require('ramda');

const requireFromEnvironment = (variable, fallback) => {
  let value = process.env[variable];

  if (!value) {
    if (fallback) return fallback;

    console.error(`No ${variable} found in environment.`);
    console.log('You probably forgot to export the correct variables.');

    process.exit(1);
  }

  return value;
};

const notFoundIfNull = (response, result) => {
  if (R.isNil(result)) {
    return response.status(404).json({
      errorCode: 404,
      errorMessage: 'Record Not Found'
    });
  }
  return response.json(result);
};

const pageFormat = (pageNumber, size) =>
  pageNumber === null
    ? null
    : {
      page: {
        number: pageNumber,
        size: size
      }
    };

const removeNullRelations = obj => {
  const isNullRelation = relation => R.isNil(relation.data);
  const getNullRelations = R.pipe(
    R.filter(isNullRelation),
    R.keys
  );
  const nullRelations = getNullRelations(obj.data.relationships);
  return R.evolve(
    {
      data: {
        relationships: R.omit(nullRelations)
      }
    },
    obj
  );
};

const idNameAttr = ['id', 'name'];

const multiInclude = function (...args) {
  return R.map(model => {
    return {
      attributes: idNameAttr,
      model
    };
  }, args);
};

const updateOrCreate = (model, values, condition) => {
  return model.findOne({ where: condition }).then(function (obj) {
    if (obj) {
      // update
      return obj.update(values);
    } else {
      // insert
      return model.create(values);
    }
  });
};

const getWhereClauseFromStatus = req => {
  const { locals } = req;
  if (!locals || !locals.status) {
    return {};
  } else {
    return {
      status: locals.status
    };
  }
};

const getIncludedSerializerConfig = included => {
  if (!included) return [];

  const includedConfig = included
    .map(modelName => {
      const serializerConfig = require('../serializers/' +
        I.singularize(modelName))();
      return {
        [modelName]: {
          ref: 'id',
          included: true,
          ...serializerConfig
        }
      };
    })
    .reduce((acc, cur) => ({ ...acc, ...cur }), {});
  return includedConfig;
};

module.exports = {
  requireFromEnvironment,
  notFoundIfNull,
  pageFormat,
  removeNullRelations,
  multiInclude,
  updateOrCreate,
  getWhereClauseFromStatus,
  getIncludedSerializerConfig
};
