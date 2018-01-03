'use strict'

const Assert = require('assert')
const Joi = require('joi')
const _ = require('lodash')
const Alternatives = require('joi/lib/types/alternatives').constructor

module.exports = function enjoi (schema, options) {
  options = options || {}

  Assert.ok(_.isObject(schema) || _.isString(schema), 'Expected schema to be an object or type string.')
  Assert.ok(_.isObject(options), 'Expected options to be an object.')

  const subSchemas = options.subSchemas
  const types = options.types
  const refineType = options.refineType

  Assert.ok(!subSchemas || _.isObject(subSchemas), 'Expected options.subSchemas to be an object.')
  Assert.ok(!types || _.isObject(types), 'Expected options.types to be an object.')
  Assert.ok(!refineType || _.isFunction(refineType), 'Expected options.refineType to be a function.')

  function resolve (current) {
    if (current.type) {
      return resolvetype(current)
    }

    if (current.anyOf) {
      return resolveAnyOf(current)
    }

    if (current.allOf) {
      return resolveAllOf(current)
    }

    if (current.oneOf) {
      return resolveOneOf(current)
    }

    if (current.$ref) {
      return resolve(resolveref(current.$ref))
    }

        // if no type is specified, just enum
    if (current.enum) {
      return Joi.any().valid(current.enum)
    }

    // If current is itself a string, interpret it as a type
    if (typeof current === 'string') {
      return resolvetype({ type: current })
    }

    // Fall through to whatever.
    console.warn('WARNING: schema missing a \'type\' or \'$ref\' or \'enum\': %s', JSON.stringify(current))
    return Joi.any()
  }

  // Resolve a value as if it was an array, a single value is translated to an array of one item
  function resolveAsArray (value) {
    if (Array.isArray(value)) {
      // found an array, thus its _per type_
      return value.map(function (v) { return resolve(v) })
    } else {
      // it's a single entity, so just resolve it normally
      return [resolve(value)]
    }
  }

  function resolveref (value) {
    let refschema

    const id = value.substr(0, value.indexOf('#') + 1)
    const path = value.substr(value.indexOf('#') + 1)

    if (id && subSchemas) {
      refschema = subSchemas[id] || subSchemas[id.substr(0, id.length - 1)]
    }
    if (!refschema) {
      refschema = schema
    }

    Assert.ok(refschema, 'Can not find schema reference: ' + value + '.')

    let fragment = refschema
    const paths = path.split('/')

    for (let i = 1; i < paths.length && fragment; i++) {
      fragment = typeof fragment === 'object' && fragment[paths[i]]
    }

    return fragment
  }

  function resolvetype (current) {
    let joischema

    const typeDefinitionMap = {
      description: 'description',
      title: 'label',
      default: 'default'
    }

    function joitype (type, format) {
      let joischema

      if (refineType) {
        type = refineType(type, format)
      }

      switch (type) {
        case 'array':
          joischema = array(current)
          break
        case 'boolean':
          joischema = Joi.boolean()
          break
        case 'integer':
        case 'number':
          joischema = number(current)
          break
        case 'object':
          joischema = object(current)
          break
        case 'string':
          joischema = string(current)
          break
        case 'null':
          joischema = Joi.any().valid(null)
          break
        default:
          if (types) {
            joischema = types[type]
          }
      }

      Assert.ok(joischema, 'Could not resolve type: ' + current.type + '.')

      return joischema
    }

    if (Array.isArray(current.type)) {
      const schemas = []
      for (let i = 0; i < current.type.length; i++) {
        schemas.push(joitype(current.type[i], current.format))
      }
      joischema = Joi.alternatives(schemas)
    } else {
      joischema = joitype(current.type, current.format)
    }

    Object.keys(typeDefinitionMap).forEach(function (key) {
      if (current[key]) {
        joischema = joischema[typeDefinitionMap[key]](current[key])
      }
    })

    return joischema
  }

  function resolveAnyOf (current) {
    Assert.ok(Array.isArray(current.anyOf), 'Expected anyOf to be an array.')

    return Joi.alternatives().try(current.anyOf.map(function (schema) {
      return resolve(schema)
    }))
  }

  function resolveAllOf (current) {
    Assert.ok(Array.isArray(current.allOf), 'Expected allOf to be an array.')

    return new All().try(current.allOf.map(function (schema) {
      return resolve(schema)
    }))
  }

  function resolveOneOf (current) {
    Assert.ok(Array.isArray(current.oneOf), 'Expected allOf to be an array.')

    return Joi.alternatives().try(current.oneOf.map(function (schema) {
      return resolve(schema)
    })).required()
  }

  function resolveproperties (current) {
    const schemas = {}

    if (!_.isObject(current.properties)) {
      return
    }

    Object.keys(current.properties).forEach(function (key) {
      const property = current.properties[key]

      let joischema = resolve(property)

      if (current.required && !!~current.required.indexOf(key)) {
        joischema = joischema.required()
      }

      schemas[key] = joischema
    })

    return schemas
  }

  function object (current) {
    let joischema = Joi.object(resolveproperties(current))

    if (current.additionalProperties === true) {
      joischema = joischema.unknown(true)
    }

    if (_.isObject(current.additionalProperties)) {
      joischema = joischema.pattern(/^/, resolve(current.additionalProperties))
    }

    if (current.additionalProperties) {
      joischema = joischema.unknown(true)
    }

    _.isNumber(current.minProperties) && (joischema = joischema.min(current.minProperties))
    _.isNumber(current.maxProperties) && (joischema = joischema.max(current.maxProperties))

    return joischema
  }

  function array (current) {
    let joischema = Joi.array()

    if (current.items) {
      joischema = joischema.items(resolveAsArray(current.items))
    } else if (current.ordered) {
      joischema = joischema.ordered(resolveAsArray(current.ordered))
    }

    _.isNumber(current.minItems) && (joischema = joischema.min(current.minItems))
    _.isNumber(current.maxItems) && (joischema = joischema.max(current.maxItems))

    if (current.uniqueItems) {
      joischema = joischema.unique()
    }

    return joischema
  }

  function number (current) {
    let joischema = Joi.number()

    if (current.type === 'integer') {
      joischema = joischema.integer()
    }

    _.isNumber(current.minimum) && (joischema = joischema.min(current.minimum))
    _.isNumber(current.maximum) && (joischema = joischema.max(current.maximum))

    return joischema
  }

  function string (current) {
    let joischema = Joi.string()

    if (current.enum) {
      return Joi.any().valid(current.enum)
    }

    switch (current.format) {
      case 'date':
      case 'date-time':
        joischema = date(current)
        break
      case 'email':
        joischema = email(current)
        break
      case 'hostname':
        joischema = Joi.string().hostname()
        break
      case 'ipv4':
        joischema = Joi.string().ip(['ipv4'])
        break
      case 'ipv6':
        joischema = Joi.string().ip(['ipv6'])
        break
      case 'uri':
        joischema = Joi.string().uri()
        break
      default:
        joischema = regularString(current)
        break
    }
    return joischema
  }

  function regularString (current) {
    let joischema = Joi.string()

    current.pattern && (joischema = joischema.regex(new RegExp(current.pattern)))

    if (_.isUndefined(current.minLength)) {
      current.minLength = 0
    }

    if (_.isNumber(current.minLength)) {
      if (current.minLength === 0) {
        joischema = joischema.allow('')
      }
      joischema = joischema.min(current.minLength)
    }

    _.isNumber(current.maxLength) && (joischema = joischema.max(current.maxLength))
    return joischema
  }

  function email (current) {
    let joischema = Joi.string().email()
    _.isNumber(current.maxLength) && (joischema = joischema.max(current.maxLength))
    return joischema
  }

  function date (current) {
    let joischema = Joi.date()
    current.min && (joischema = joischema.min(current.min))
    current.max && (joischema = joischema.max(current.max))
    return joischema
  }

  return resolve(schema)
}

class All extends Alternatives {
  constructor () {
    super()
    this._type = 'all'
    this._invalids.remove(null)
    this._inner.matches = []
  }
  _base (value, state, options) {
    let errors = []
    const results = []

    options = Object.assign({}, options, { stripUnknown: true })

    for (let i = 0, il = this._inner.matches.length; i < il; ++i) {
      const item = this._inner.matches[i]
      let schema = item.schema
      if (!schema) {
        const failed = item.is._validate(item.ref(state.parent, options), null, options, state.parent).errors
        schema = failed ? item.otherwise : item.then
        if (!schema) {
          continue
        }
      }

      const result = schema._validate(value, state, options)

      if (!result.errors) {
        results.push(result.value)
      } else {
        errors = errors.concat(result.errors)
      }
    }

    return { value: value, errors: errors }
  }
}
