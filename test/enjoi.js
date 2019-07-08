'use strict'

var Test = require('tape')
var Enjoi = require('../lib/enjoi')
var Joi = require('@hapi/joi')

Test('enjoi', function (t) {
  t.test('valid', function (t) {
    t.plan(9)

    var schema = Enjoi({
      title: 'Example Schema',
      description: 'An example to test against.',
      type: 'object',
      properties: {
        firstName: {
          type: 'string',
          minLength: 0
        },
        lastName: {
          type: 'string',
          minLength: 1
        },
        tags: {
          type: 'array',
          items: {
            type: 'string',
            minLength: 1
          }
        },
        age: {
          type: 'integer',
          minimum: 0
        }
      },
      required: ['firstName', 'lastName']
    })

    t.equal(schema._type, 'object', 'defined object.')
    t.equal(schema._flags.label, 'Example Schema')
    t.equal(schema._description, 'An example to test against.', 'description set.')
    t.equal(schema._inner.children.length, 4, '4 properties defined.')

    Joi.validate({ firstName: 'John', lastName: 'Doe', age: 45, tags: ['man', 'human'] }, schema, function (error, value) {
      t.ok(!error, 'no error.')
    })

    Joi.validate({ firstName: '', lastName: 'Doe', age: 45, tags: ['man', 'human'] }, schema, function (error, value) {
      t.ok(!error, 'no error.')
    })

    Joi.validate({ firstName: 'John', age: 45, tags: ['man', 'human'] }, schema, function (error, value) {
      t.ok(error, 'error.')
    })

    Joi.validate({ firstName: 'John', lastName: 'Doe', age: 45, tags: [1, 'human'] }, schema, function (error, value) {
      t.ok(error, 'error.')
    })

    Joi.validate({ firstName: 'John', lastName: 'Doe', age: 45, tags: ['', 'human'] }, schema, function (error, value) {
      t.ok(error, 'error.')
    })
  })

  t.test('with ref', function (t) {
    t.plan(1)

    var schema = Enjoi({
      'title': 'Example Schema',
      'type': 'object',
      'properties': {
        'name': {
          '$ref': '#/definitions/name'
        }
      },
      'definitions': {
        'name': {
          'type': 'string'
        }
      }
    })

    Joi.validate({ name: 'Joe' }, schema, function (error, value) {
      t.ok(!error, 'no error.')
    })
  })

  t.test('with external ref', function (t) {
    t.plan(1)

    var schema = Enjoi({
      'title': 'Example Schema',
      'type': 'object',
      'properties': {
        'name': {
          '$ref': 'definitions#/name'
        }
      }
    }, {
      subSchemas: {
        'definitions': {
          'name': {
            'type': 'string'
          }
        }
      }
    })

    Joi.validate({ name: 'Joe' }, schema, function (error, value) {
      t.ok(!error, 'no error.')
    })
  })

  t.test('with both inline and external refs', function (t) {
    t.plan(1)

    var schema = Enjoi({
      title: 'Example Schema',
      type: 'object',
      properties: {
        firstname: {
          $ref: '#/definitions/firstname'
        },
        surname: {
          $ref: 'definitions#/surname'
        }
      },
      definitions: {
        firstname: {
          type: 'string'
        }
      }
    }, {
      subSchemas: {
        definitions: {
          surname: {
            type: 'string'
          }
        }
      }
    })

    Joi.validate({ firstname: 'Joe', surname: 'Doe' }, schema, function (error, value) {
      t.ok(!error, 'no error.')
    })
  })
})

Test('types', function (t) {
  t.test('object min/max length', function (t) {
    t.plan(3)

    const schema = Enjoi({
      'type': 'object',
      'maxProperties': 2,
      'minProperties': 1
    })

    Joi.validate({ a: 'a', b: 'b' }, schema, function (error, value) {
      t.ok(!error, 'no error.')
    })

    Joi.validate({ a: 'a', b: 'b', c: 'c' }, schema, function (error, value) {
      t.ok(error, 'error.')
    })

    Joi.validate({}, schema, function (error, value) {
      t.ok(error, 'error.')
    })
  })

  t.test('arrays and numbers', function (t) {
    t.plan(2)

    const schema = Enjoi({
      'type': 'array',
      'items': {
        'type': 'number'
      },
      'maxItems': 10,
      'minItems': 0
    })

    Joi.validate([1, 2], schema, function (error, value) {
      t.ok(!error, 'no error.')
    })

    Joi.validate([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], schema, function (error, value) {
      t.ok(error, 'error.')
    })
  })

  t.test('arrays with specific item type assignment', function (t) {
    t.plan(7)

    const schema = Enjoi({
      'type': 'array',
      'items': [
        {
          'type': 'number'
        }, {
          'type': 'string'
        }
      ]
    })

    Joi.validate([1, 'abc'], schema, function (error) {
      t.ok(!error, 'no error.')
    })

    Joi.validate([0, 1], schema, function (error) {
      t.ok(!error, 'no error.')
    })

    Joi.validate(['abc', 'def'], schema, function (error) {
      t.ok(!error, 'no error.')
    })

    Joi.validate([1], schema, function (error) {
      t.ok(!error, 'no error.')
    })

    Joi.validate(['abc'], schema, function (error) {
      t.ok(!error, 'no error.')
    })

    Joi.validate([], schema, function (error) {
      t.ok(!error, 'no error.')
    })

    Joi.validate([{ foo: 'bar' }], schema, function (error) {
      t.ok(error, 'error.')
    })
  })

  t.test('arrays with ordered item assignment', function (t) {
    t.plan(8)

    const schema = Enjoi({
      'type': 'array',
      'ordered': [
        {
          'type': 'number'
        }, {
          'type': 'string'
        }
      ]
    })

    Joi.validate([1, 'abc'], schema, function (error) {
      t.ok(!error, 'no error.')
    })

    Joi.validate([], schema, function (error) {
      t.ok(!error, 'no error.')
    })

    Joi.validate([0, 1], schema, function (error) {
      t.ok(error, 'error.')
    })

    Joi.validate(['abc', 'def'], schema, function (error) {
      t.ok(error, 'error.')
    })

    Joi.validate([1], schema, function (error) {
      t.ok(!error, 'no error.')
    })

    Joi.validate(['abc'], schema, function (error) {
      t.ok(error, 'error.')
    })

    Joi.validate([{ foo: 'bar' }], schema, function (error) {
      t.ok(error, 'error.')
    })

    Joi.validate([1, 'abc', 'def'], schema, function (error) {
      t.ok(error, 'error.')
    })
  })

  t.test('arrays and refs', function (t) {
    t.plan(2)

    const schema = Enjoi({
      'type': 'array',
      'items': {
        '$ref': 'definitions#/number'
      }
    }, {
      subSchemas: {
        'definitions': {
          'number': {
            'type': 'number',
            'minimum': 0,
            'maximum': 2
          }
        }
      }
    })

    Joi.validate([1, 2], schema, function (error, value) {
      t.ok(!error, 'no error.')
    })

    Joi.validate([1, 3], schema, function (error, value) {
      t.ok(error, 'error.')
    })
  })

  t.test('number exclusiveMinimum exclusiveMaximum', function (t) {
    t.plan(3)

    const schema = Enjoi({
      'type': 'number',
      'exclusiveMinimum': 0,
      'exclusiveMaximum': 2
    })

    Joi.validate(0, schema, function (error, value) {
      t.ok(error, 'error.')
    })

    Joi.validate(1, schema, function (error, value) {
      t.ok(!error, 'no error.')
    })

    Joi.validate(2, schema, function (error, value) {
      t.ok(error, 'error.')
    })
  })

  t.test('number multipleOf', function (t) {
    t.plan(3)

    const schema = Enjoi({
      'type': 'number',
      'multipleOf': 1.5
    })

    Joi.validate(4, schema, function (error, value) {
      t.ok(error, 'error.')
    })

    Joi.validate(4.5, schema, function (error, value) {
      t.ok(!error, 'no error.')
    })

    Joi.validate(0, schema, function (error, value) {
      t.ok(!error, 'no error.')
    })
  })

  t.test('arrays and unique', function (t) {
    t.plan(2)

    const schema = Enjoi({
      'type': 'array',
      'items': {
        'type': 'integer'
      },
      'uniqueItems': true
    })

    Joi.validate([1, 2], schema, function (error, value) {
      t.ok(!error, 'no error.')
    })

    Joi.validate([1, 1], schema, function (error, value) {
      t.ok(error, 'error.')
    })
  })

  t.test('boolean', function (t) {
    t.plan(3)

    const schema = Enjoi({
      'type': 'boolean'
    })

    Joi.validate('1', schema, function (error, value) {
      t.ok(error, 'error.')
    })

    Joi.validate('true', schema, function (error, value) {
      t.ok(!error, 'no error.')
    })

    Joi.validate(true, schema, function (error, value) {
      t.ok(!error, 'no error.')
    })
  })

  t.test('boolean strictMode', function (t) {
    t.plan(3)

    const schema = Enjoi({
      'type': 'boolean'
    }, {
      strictMode: true
    })

    Joi.validate('1', schema, function (error, value) {
      t.ok(error, 'error.')
    })

    Joi.validate('true', schema, function (error, value) {
      t.ok(error, 'error in strictMode.')
    })

    Joi.validate(true, schema, function (error, value) {
      t.ok(!error, 'no error.')
    })
  })

  t.test('string regex', function (t) {
    t.plan(2)

    const schema = Enjoi({
      'type': 'string',
      'pattern': /foobar/
    })

    Joi.validate('foo', schema, function (error, value) {
      t.ok(error, 'error.')
    })

    Joi.validate('foobar', schema, function (error, value) {
      t.ok(!error, 'no error.')
    })
  })

  t.test('string length', function (t) {
    t.plan(3)

    const schema = Enjoi({
      'type': 'string',
      'minLength': 2,
      'maxLength': 4
    })

    Joi.validate('f', schema, function (error, value) {
      t.ok(error, 'error.')
    })

    Joi.validate('foobar', schema, function (error, value) {
      t.ok(error, 'error.')
    })

    Joi.validate('foo', schema, function (error, value) {
      t.ok(!error, 'no error.')
    })
  })

  t.test('string email', function (t) {
    t.plan(3)

    const schema = Enjoi({
      'type': 'string',
      'format': 'email',
      'maxLength': 20
    })

    Joi.validate('', schema, function (error, value) {
      t.ok(error, 'empty string.')
    })

    Joi.validate('wrongemail', schema, function (error, value) {
      t.ok(error, 'wrong email error.')
    })

    Joi.validate('right@email.com', schema, function (error, value) {
      t.ok(!error, 'good email.')
    })
  })

  t.test('string date RFC3339', function (t) {
    const validDateValues = [
      '2018-11-16',
      '2018-02-31'
    ]
    const invalidDateValues = [
      '',
      '1akd2536',
      '20181116',
      '16-11-2018',
      '16-11-2018T12:12:12Z',
      '12:12:12Z'
    ]
    t.plan(validDateValues.length + invalidDateValues.length)

    const schema = Enjoi({
      'type': 'string',
      'format': 'date'
    })

    // Valid values
    validDateValues.forEach((time) => {
      Joi.validate(time, schema, function (error, value) {
        t.ok(!error, time + ' should be valid')
      })
    })

    // Invalid values
    invalidDateValues.forEach((time) => {
      Joi.validate(time, schema, function (error, value) {
        t.ok(error, time + ' should be invalid')
      })
    })
  })

  t.test('string time RFC3339', function (t) {
    const validTimeValues = [
      '12:00:00Z',
      '12:00:00+02:10',
      '12:00:00-02:10',
      '12:00:00.1Z',
      '12:00:00.123Z',
      '12:00:00.123456789Z'
    ]
    const invalidTimeValues = [
      '',
      '1akd2536',
      '2:0:0Z',
      '2:00:00Z',
      '12:00:00',
      '2018-11-16',
      '12:00:00.Z',
      '12:00:00+02',
      '12:00:00+2:00',
      '16-11-2018T12:12:12Z'
    ]
    t.plan(validTimeValues.length + invalidTimeValues.length)

    const schema = Enjoi({
      'type': 'string',
      'format': 'time'
    })

    // Valid values
    validTimeValues.forEach((time) => {
      Joi.validate(time, schema, function (error, value) {
        t.ok(!error, time + ' should be valid')
      })
    })

    // Invalid values
    invalidTimeValues.forEach((time) => {
      Joi.validate(time, schema, function (error, value) {
        t.ok(error, time + ' should be invalid')
      })
    })
  })

  t.test('string date-time RFC3339', function (t) {
    const validDateTimeValues = [
      '2018-11-16T12:00:00Z',
      '2018-11-16t12:00:00z',
      '2018-11-16T12:00:00+02:00',
      '2018-11-16T12:00:00-02:00',
      '2018-11-16T12:00:00.1Z',
      '2018-11-16T12:00:00.123Z',
      '2018-11-16T12:00:00.123456789Z'
    ]
    const invalidDateTimeValues = [
      '',
      '1akd2536',
      '2018-11-16',
      '12:12:12Z',
      '20181116T121212Z',
      '2018-11-16T12:00:00',
      '2018-11-16T12:00:00.Z'
    ]
    t.plan(validDateTimeValues.length + invalidDateTimeValues.length)

    const schema = Enjoi({
      'type': 'string',
      'format': 'date-time'
    })

    // Valid values
    validDateTimeValues.forEach((time) => {
      Joi.validate(time, schema, function (error, value) {
        t.ok(!error, time + ' should be valid')
      })
    })

    // Invalid values
    invalidDateTimeValues.forEach((time) => {
      Joi.validate(time, schema, function (error, value) {
        t.ok(error, time + ' should be invalid')
      })
    })
  })

  t.test('string hostname', function (t) {
    t.plan(3)

    const schema = Enjoi({
      'type': 'string',
      'format': 'hostname'
    })

    Joi.validate('', schema, function (error, value) {
      t.ok(error, 'empty string.')
    })

    Joi.validate('not@host', schema, function (error, value) {
      t.ok(error, 'bad host error.')
    })

    Joi.validate('isahost.com', schema, function (error, value) {
      t.ok(!error, 'good host.')
    })
  })

  t.test('string ipv4', function (t) {
    t.plan(3)

    const schema = Enjoi({
      'type': 'string',
      'format': 'ipv4'
    })

    Joi.validate('', schema, function (error, value) {
      t.ok(error, 'empty string.')
    })

    Joi.validate('asdf', schema, function (error, value) {
      t.ok(error, 'bad ipv4 error.')
    })

    Joi.validate('127.0.0.1', schema, function (error, value) {
      t.ok(!error, 'good ipv4.')
    })
  })

  t.test('string ipv6', function (t) {
    t.plan(3)

    const schema = Enjoi({
      'type': 'string',
      'format': 'ipv6'
    })

    Joi.validate('', schema, function (error, value) {
      t.ok(error, 'empty string.')
    })

    Joi.validate('asdf', schema, function (error, value) {
      t.ok(error, 'bad ipv6 error.')
    })

    Joi.validate('::1', schema, function (error, value) {
      t.ok(!error, 'good ipv6.')
    })
  })

  t.test('string uri', function (t) {
    t.plan(3)

    const schema = Enjoi({
      'type': 'string',
      'format': 'uri'
    })

    Joi.validate('', schema, function (error, value) {
      t.ok(error, 'empty string.')
    })

    Joi.validate('asdf', schema, function (error, value) {
      t.ok(error, 'bad uri error.')
    })

    Joi.validate('http://example.com', schema, function (error, value) {
      t.ok(!error, 'good uri.')
    })
  })

  t.test('string binary', function (t) {
    t.plan(2)

    const schema = Enjoi({
      type: 'string',
      format: 'binary'
    })

    Joi.validate(Buffer.from('hello'), schema, function (error) {
      t.ok(!error, 'no error.')
    })

    Joi.validate([1, 2, 3, 4], schema, function (error) {
      t.ok(error, 'error.')
    })
  })

  t.test('string binary min/max', function (t) {
    t.plan(3)

    const schema = Enjoi({
      type: 'string',
      format: 'binary',
      minLength: 2,
      maxLength: 4
    })

    Joi.validate(Buffer.from('hello'), schema, function (error) {
      t.ok(error, 'error.')
    })

    Joi.validate(Buffer.from('h'), schema, function (error) {
      t.ok(error, 'error.')
    })

    Joi.validate(Buffer.from('hell'), schema, function (error) {
      t.ok(!error, 'no error.')
    })
  })

  t.test('string byte', function (t) {
    t.plan(2)

    const schema = Enjoi({
      type: 'string',
      format: 'byte'
    })

    Joi.validate('U3dhZ2dlciByb2Nrcw==', schema, function (error) {
      t.ok(!error, 'no error.')
    })

    Joi.validate('hello', schema, function (error) {
      t.ok(error, 'error.')
    })
  })

  t.test('string uuid', function (t) {
    t.plan(3)

    const schema = Enjoi({
      type: 'string',
      format: 'uuid'
    })

    Joi.validate('36c6e954-3c0a-4fbf-a4cd-6993ffe3bdd2', schema, function (error) {
      t.ok(!error, 'no error.')
    })

    Joi.validate('', schema, function (error, value) {
      t.ok(error, 'empty string.')
    })

    Joi.validate('not a uuid', schema, function (error) {
      t.ok(error, 'error.')
    })
  })

  t.test('string guid', function (t) {
    t.plan(3)

    const schema = Enjoi({
      type: 'string',
      format: 'guid'
    })

    Joi.validate('36c6e954-3c0a-4fbf-a4cd-6993ffe3bdd2', schema, function (error) {
      t.ok(!error, 'no error.')
    })

    Joi.validate('', schema, function (error, value) {
      t.ok(error, 'empty string.')
    })

    Joi.validate('not a uuid', schema, function (error) {
      t.ok(error, 'error.')
    })
  })

  t.test('no type, ref, or enum validates anything.', function (t) {
    t.plan(3)

    const schema = Enjoi({
      'description': 'something'
    })

    Joi.validate('A', schema, function (error, value) {
      t.ok(!error, 'no error.')
    })

    Joi.validate({ 'A': 'a' }, schema, function (error, value) {
      t.ok(!error, 'no error.')
    })

    Joi.validate([1, 2, 3], schema, function (error, value) {
      t.ok(!error, 'no error.')
    })
  })

  t.test('shorthand type', function (t) {
    t.plan(1)

    const schema = Enjoi('string')
    Joi.validate('A', schema, function (error, value) {
      t.ok(!error, 'no error.')
    })
  })

  t.test('shorthand property type', function (t) {
    t.plan(1)

    const schema = Enjoi({
      'type': 'object',
      'properties': {
        'name': 'string'
      }
    })

    Joi.validate({ name: 'test' }, schema, function (error, value) {
      t.ok(!error, 'no error.')
    })
  })

  t.test('enum', function (t) {
    t.plan(5)

    let schema = Enjoi({
      'enum': ['A', 'B']
    })

    Joi.validate('A', schema, function (error, value) {
      t.ok(!error, 'no error.')
    })

    Joi.validate('B', schema, function (error, value) {
      t.ok(!error, 'no error.')
    })

    Joi.validate('C', schema, function (error, value) {
      t.ok(error, 'error.')
    })

    schema = Enjoi({
      type: 'string',
      'enum': ['A', 'B']
    })

    Joi.validate('B', schema, function (error, value) {
      t.ok(!error, 'no error.')
    })

    Joi.validate('C', schema, function (error, value) {
      t.ok(error, 'error.')
    })
  })

  t.test('unknown type fails', function (t) {
    t.plan(1)

    t.throws(function () {
      Enjoi({
        'type': 'something'
      })
    })
  })

  t.test('array for type', function (t) {
    t.plan(3)

    const schema = Enjoi({
      'type': ['boolean', 'string']
    })

    Joi.validate(10, schema, function (error, value) {
      t.ok(error, 'error.')
    })

    Joi.validate(true, schema, function (error, value) {
      t.ok(!error, 'no error.')
    })

    Joi.validate('true', schema, function (error, value) {
      t.ok(!error, 'no error.')
    })
  })

  t.test('array for type with null support', function (t) {
    t.plan(3)

    const schema = Enjoi({
      'type': ['string', 'null']
    })

    Joi.validate('test', schema, function (error, value) {
      t.ok(!error, 'no error.')
    })

    Joi.validate(null, schema, function (error, value) {
      t.ok(!error, 'no error.')
    })

    Joi.validate(false, schema, function (error, value) {
      t.ok(error, 'error.')
    })
  })
})
