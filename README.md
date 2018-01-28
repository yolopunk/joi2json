# Joi ⇄ JSON-Schema Converter

[![JavaScript Style Guide][style-image]][style-url]
[![Build Status][travis-image]][travis-url]
[![npm download][download-image]][download-url]

[style-image]: https://img.shields.io/badge/code_style-standard-brightgreen.svg
[style-url]: https://standardjs.com
[travis-image]: https://travis-ci.org/yolopunk/joi2json.svg?branch=master
[travis-url]: https://travis-ci.org/yolopunk/joi2json
[download-image]: https://img.shields.io/npm/dm/joi2json.svg?style=flat-square
[download-url]: https://npmjs.org/package/joi2json

[JSON Schema](https://github.com/json-schema-org/json-schema-spec) and [Joi](https://github.com/hapijs/joi) converter

## Install
```bash
  $ npm install joi2json --save
```

## Usage
```js
  const parser = require('joi2json')

  const schema = {
    "title": "Person",
    "type": "object",
    "properties": {
        "firstName": {
            "type": "string"
        },
        "lastName": {
            "type": "string"
        },
        "age": {
            "description": "Age in years",
            "type": "integer",
            "minimum": 0
        }
    },
    "required": ["firstName", "lastName"]
  }

  // JSON Schema to Joi
  const joiObj = parser.enjoi(schema)

  // Joi to JSON Schema
  const jsonSchema = parser.dejoi(joiObj)
```