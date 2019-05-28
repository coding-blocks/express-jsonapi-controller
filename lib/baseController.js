const JSONAPISerializer = require('jsonapi-serializer').Serializer
const JSONAPIDeserializer = require('jsonapi-serializer').Deserializer
const JSONAPIError = require('jsonapi-serializer').Error
const R = require('ramda')
const assert = require('assert')

class Controller {
  constructor (model, db, optsGenerator, opts = {
    defaultExcludes: []
  }) {
    this._model = model
    this._type = model.name
    this.db = db
    this.optsGenerator = optsGenerator
    this.opts = opts
    new Array(
      'findAll',
      'handleQuery',
      'generateIncludeStatement',
      'handleQueryById',
      'handleUpdateById',
      'handleCreate',
      'handleDeleteById',
      'serialize',
      'deserialize',
      'handleReview',
      'handlePublish',
      'get',
      'getExcludedAttributes'
    ).forEach(methodName => {
      this[methodName] = this[methodName].bind(this)
    })
  }

  get (val, path) {
    const keys = path.split('.')
    return keys.reduce((acc, key) => {
      if (typeof acc === 'undefined' || acc === null) {
        return acc
      } else {
        return acc[key]
      }
    }, val)
  }

  serialize (payload, includeModelNames) {
    const serializer = new JSONAPISerializer(
      this._type,
      this.optsGenerator(includeModelNames, 'serialize')
    )
    return serializer.serialize(payload)
  }

  async deserialize (payload) {
    const deserializer = new JSONAPIDeserializer(
      this.optsGenerator(null, 'deserialize')
    )
    try {
      const obj = await deserializer.deserialize(payload)

      Object.keys(obj).forEach(key => {
        if (
          typeof obj[key] === 'object' &&
          !Array.isArray(obj[key]) &&
          obj[key] !== null
        ) {
          obj[key + 'Id'] = obj[key].id
        }
      })

      return obj
    } catch (err) {
      this.handleError(err)
    }
  }

  // This method is responsible for querying db using suitable conditions
  findAll (req, res, next) {
    return this._model.findAndCountAll({
      ...this.generateAttributesClause(req),
      distinct: 'id',
      where: this.generateWhereClause(req),
      include: this.generateIncludeStatement(req),
      order: this.generateSortingCondition(req),
      limit: this.generateLimitStatement(req),
      offset: this.generateOffsetStatement(req)
    })
  }

  findById (req, res, next) {
    const where = R.mergeDeepLeft(
      {
        id: req.params.id
      },
      this.generateWhereClause(req) || {}
    )

    return this._model.findOne({
      ...this.generateAttributesClause(req),
      where,
      include: this.generateIncludeStatement(req),
      order: this.generateSortingCondition(req)
    })
  }

  // cosntruct attributes clause based on
  generateAttributesClause (req) {
    const { fields } = req.query
    if (!fields) return {}

    return {
      attributes: R.flatten(
        Object.keys(fields).map(model =>
          fields[model]
            .split(',')
            .map(attr => model === this._type ? attr : `${model}.${attr}`)
        )
      )
    }
  }

  // contruct a where clause based on req.query.filter Object
  generateWhereClause (req) {
    const { filter } = req.query
    const status = this.get(req, 'locals.status')

    // if we don't have req.locals.status, just use the old logic
    if (!status) return filter || undefined

    // if we have filter qp, merge; else just add status
    if (filter) return { ...filter, status }
    else return { status }
  }

  // construct a Sorting Condition(value for sequelize sort: key) based on req.query.sort
  generateSortingCondition (req) {
    if (!req.query.sort) return []

    const sortArray = req.query.sort.split(',')
    return sortArray.map(prop => {
      if (prop.split('.').length === 1) {
        return prop.charAt(0) === '-'
          ? [prop.substring(1), 'DESC']
          : [prop, 'ASC']
      } else {
        const cols = prop.split('.')
        const isNeg = cols[0].charAt(0) === '-'
        if (isNeg) cols[0] = cols[0].substring(1)

        return [
          ...cols.map(attrName => this.db[attrName] || attrName),
          isNeg ? 'DESC' : 'ASC'
        ]
      }
    })
  }

  // construct a include Condition(value for sequelize include:key) base on req.query.include
  generateIncludeStatement (req) {
    // get all modelNames listed in req.query.include
    const includedModels = this.getIncludeModelNames(req)
    const excludeModels = this.getExcludedModelNames(req)

    return Object.keys(this._model.associations)
      .map(modelName => {
        const model = this._model.associations[modelName]
        const exclude = excludeModels.find(el => el.name === modelName)

        const includeObj = {
          model: model.target
        }

        if (model.isAliased) {
          includeObj.as = model.as
        }

        if (exclude) {
          if (exclude.own) {
            // exclude this model as well
            return { model: null }
          } else {
            // exclude its relations only
            return includeObj
          }
        }

        if (includedModels.includes(modelName)) {
          // make a nested include if users requested this resource
          const innerIncludes = {
            all: true
          }

          return {
            ...includeObj,
            include: innerIncludes
          }
        } else {
          return includeObj // else return just include this one.
        }
      })
      .filter(v => v.model)
      .filter(o =>
        this.opts.defaultExcludes.indexOf(o.model.name) === -1)
  }

  // parse req.query.include for model names.
  // We only support single level includes as of now
  getIncludeModelNames (req) {
    if (!req || !req.query.include) return []
    const includedModels = req.query.include.split(',')
    return includedModels
  }

  // support excluding all relationships of a included model
  getExcludedModelNames (req) {
    if (!req || !req.query.exclude) return []

    const excludedModels = req.query.exclude.split(',').map(modelStr => {
      const [modelName, wildcard] = modelStr.split('.')
      if (wildcard === '*') {
        return {
          name: modelName,
          // exclude this property also
          own: false
        }
      } else {
        return {
          name: modelName,
          // only exclude its relations
          own: true
        }
      }
    })

    return excludedModels
  }

  generateOffsetStatement (req) {
    const page = req.query.page || {}
    return +page.offset || 0
  }

  generateLimitStatement (req) {
    const page = req.query.page || {}
    return +page.limit || 20
  }

  generatePaginationObject (req, count) {
    const limit = this.generateLimitStatement(req)
    const offset = this.generateOffsetStatement(req)
    return {
      count,
      currentOffset: offset,
      currentPage: Math.floor(offset / limit) + 1,
      nextOffset: offset + limit < count ? offset + limit : null,
      prevOffset: offset - limit >= 0 ? offset - limit : null,
      totalPages: Math.ceil(count / limit)
    }
  }

  // Handles Error Responses
  // err: {
  //     code: 400,
  //     name: 'NO_LICENCES_LEFT',
  //     message: 'No licenses left for this run'
  // }
  handleError (err, res) {
    console.error(err)
    if (res) {
      res.status(err.code || 500).json(
        new JSONAPIError({
          code: err.code
            ? err.code
            : err.name === 'SequelizeDatabaseError'
              ? 400
              : 500,
          title: err.name,
          detail: err.message,
          extra: err.extra
        })
      )
    }
  }

  // Handles GET: /:resource/
  handleQuery (req, res, next) {
    if (req.locals && req.locals.isForbidden) {
      if (req.locals.message) {
        return res.status(403).json({ message: req.locals.message })
      }
      return res.sendStatus(403)
    }

    this.findAll(...arguments)
      .then(({ rows, count }) => {
        const includeModelNames = this.getIncludeModelNames(req)
        rows = rows.map(_ => _.get({ plain: true }))
        rows.pagination = this.generatePaginationObject(req, count)
        res.json(this.serialize(rows, includeModelNames))
      })
      .catch(err => this.handleError(err, res))
  }

  // Handles GET: /:resource/:id
  handleQueryById (req, res, next) {
    if (req.locals && req.locals.isForbidden) {
      if (req.locals.message) {
        return res.status(403).json({ message: req.locals.message })
      }
      return res.sendStatus(403)
    }

    this.findById(...arguments)
      .then(data => {
        if (!data) {
          return this.handleError(
            {
              code: 404,
              name: 'NotFound',
              message: 'Requested resource not found'
            },
            res
          )
        }
        const includeModelNames = this.getIncludeModelNames(req)
        data = data.get({ plain: true })
        res.json(this.serialize(data, includeModelNames))
      })
      .catch(err => this.handleError(err, res))
  }

  // Handles POST /:resource/
  async handleCreate (req, res, next) {
    try {
      if (req.locals && req.locals.isForbidden) {
        if (req.locals.message) {
          return res.status(403).json({ message: req.locals.message })
        }
        return res.sendStatus(403)
      }

      if (!req.body) return res.sendStatus(400)

      // remove these keys, even if specified
      const modelObj = await this.deserialize(req.body)
      const exclude = this.getExcludedAttributes(req)
      exclude.forEach(name => {
        delete modelObj[name]
      })

      const dbObj = await this._model.create(modelObj)
      const result = await this._model.findById(dbObj.id, {
        include: this.generateIncludeStatement()
      })
      res.json(this.serialize(result))

      return result
    } catch (err) {
      this.handleError(err, res)
    }
  }

  // Handles PATCH: /:resource/:id
  async handleUpdateById (req, res, next) {
    try {
      if (req.locals && req.locals.isForbidden) {
        if (req.locals.message) {
          return res.status(403).json({ message: req.locals.message })
        }
        return res.sendStatus(403)
      }

      const modelObj = await this.deserialize(req.body)
      modelObj.updatedById = req.user.id
      // remove these keys, even if specified
      const exclude = this.getExcludedAttributes(req)
      exclude.forEach(name => {
        delete modelObj[name]
      })
      await this._model.update(modelObj, {
        where: {
          id: req.params.id
        }
      })
      const result = await this._model.findById(req.params.id, {
        include: this.generateIncludeStatement()
      })
      res.json(this.serialize(result))
    } catch (err) {
      this.handleError(err, res)
    }
  }

  // Handles DELETE: /:resource/:id
  handleDeleteById (req, res, next) {
    if (req.locals && req.locals.isForbidden) {
      if (req.locals.message) {
        return res.status(403).json({ message: req.locals.message })
      }
      return res.sendStatus(403)
    }

    const resourceId = req.params.id
    this._model
      .destroy({
        where: {
          id: resourceId
        }
      })
      .then(res.sendStatus(204))
      .catch(err => this.handleError(err, res))
  }

  // Handles POST: /:resource/:id/review
  async handleReview (req, res, next) {
    const { id } = req.params
    const resource = await this._model.findById(id)

    if (!resource) {
      return res.sendStatus(404)
    }

    if (!resource.status) {
      // this entity donot have a status flag;
      return res.status(404).json({
        err: 'this entity does not have a status flag'
      })
    }

    try {
      assert.strictEqual(
        resource.status,
        'draft',
        'Can only review a entity in draft state'
      )
      resource.set('status', 'reviewed')
      resource.set('reviewedById', req.user.id)
      await resource.save()
      resource.reviewedBy = req.user
      res.json(this.serialize(resource))
    } catch (err) {
      this.handleError(err, res)
    }
  }

  async handlePublish (req, res, next) {
    const { id } = req.params
    const resource = await this._model.findById(id)

    if (!resource) {
      return res.sendStatus(404)
    }

    if (!resource.status) {
      // this entity donot have a status flag;
      return res.status(404).json({
        err: 'this entity does not have a status flag'
      })
    }

    try {
      assert.strictEqual(
        resource.status,
        'reviewed',
        'Can only publish a reviewed enitity'
      )
      resource.set('status', 'published')
      resource.set('publishedById', req.user.id)
      await resource.save()
      resource.publishedBy = req.user
      res.json(this.serialize(resource))
    } catch (err) {
      this.handleError(err, res)
    }
  }

  // attributes to strip off before POST/PATCH
  getExcludedAttributes (req) {
    return [
      'status',
      'createdBy',
      'reviewedBy',
      'publishedBy',
      'createdAt',
      'updatedAt'
    ]
  }
}

module.exports = Controller
