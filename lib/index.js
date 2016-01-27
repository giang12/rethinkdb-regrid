'use strict'

var co = require('co')
var omit = require('mout/object/omit')

var WriteStream = require('./WriteStream')
var ReadStream = require('./ReadStream')

var includes = function (list, item) {
  return list.indexOf(item) !== -1
}

var defaultConf = {
  fileTable: 'rethinkdbfs_files',
  chunkTable: 'rethinkdbfs_chunks',
  chunkIndex: 'chunk_lookup',
  chunkSize: 1024 * 255,
  discovery: true,
  servers: [
    {host: 'localhost', port: 28015}
  ]
}

var RethinkDBFSBase = {

  prepDB () {
    return co(function *() {
      var tableList = yield this.r.tableList()

      // Create tables if they don't exist.
      if (!includes(tableList, this.conf.fileTable)) {
        yield this.r.tableCreate(this.conf.fileTable)
      }
      if (!includes(tableList, this.conf.chunkTable)) {
        yield this.r.tableCreate(this.conf.chunkTable)
      }

      var chunkIndexList = yield this.r.table(this.conf.chunkTable).indexList()

      // Create indexes if they don't exist.
      if (!includes(chunkIndexList, this.conf.chunkIndex)) {
        yield this.r.table(this.conf.chunkTable).indexCreate(this.conf.chunkIndex, [this.r.row('file_id'), this.r.row('num')])
        yield this.r.table(this.conf.chunkTable).indexWait(this.conf.chunkIndex)
      }
    }.bind(this)).catch(function (err) {
      console.log(err)
    })
  },

  writeFile (meta) {
    return new WriteStream(this.r, this.conf, meta)
  },

  readFile (meta) {
    return new ReadStream(this.r, this.conf, meta)
  }

}

var RethinkDBFS = function (conf) {
  var obj = Object.create(RethinkDBFSBase)

  if (!conf || !conf.db) {
    throw new Error(`Minimum RethinkDBFS configuration is {db: 'dbname'}`)
  }

  obj.conf = Object.assign({}, defaultConf, conf)

  obj.r = require('rethinkdbdash')(omit(obj.conf, 'fileTable', 'chunkTable', 'chunkIndex', 'chunkSize'))

  return obj
}

module.exports = RethinkDBFS