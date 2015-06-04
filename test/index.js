/**
 * import(s)
 */

var expect = require('expect.js');
var format = require('util').format;
var amqp = require('amqplib/callback_api');
var parser = require('socket.io-parser');
var msgpack = require('msgpack-js');
var Emitter = require('../');


/**
 * test(s)
 */

function bail(err) {
    console.error(err);
    process.exit(1);
}

var connection = null;
var q = 'tasks';

describe('socket.io-rabbitmq-emitter', function () {
    this.conn = null;


    before(function (done) {
        amqp.connect("amqp://guest:guest@192.168.59.103:5672", function (err, conn) {
                if (err != null) bail(err);
                connection = conn;

                done();
            }
        );
    });


    after(function (done) {
        if (connection)
            connection.close();

        done();
    });

    it('should be emit', function (done) {

        var emitter = Emitter({host: '192.168.59.103'});

        var args = ['hello', 'world'];

        if (connection) {

            var ok = connection.createChannel(function on_open(err, ch) {
                    if (err != null) bail(err);
                    ch.assertQueue(emitter.key);
                    ch.consume(emitter.key, function (msg) {

                        var getOffset = function (msg) {
                            var offset = 0;
                            for (var i = 0; i < msg.length; i++) {
                                if (msg[i] === 0x20) { // space
                                    offset = i;
                                    break;
                                }
                            }
                            return offset;
                        };

                        var offset = getOffset(msg);

                        var key = msg.slice(0, offset);
                        var payload = msgpack.decode(msg.slice(offset + 1, msg.length));
                        var data = payload[0];
                        expect(key).to.match(/^socket\.io\-zmq#emitter\-.*$/);
                        expect(payload).to.be.an(Array);
                        expect(data.data[0]).to.contain('hello');
                        expect(data.data[1]).to.contain('world');
                        expect(data.nsp).to.eql('/');

                        done();
                    });
                }
            );
        }

        // emit !!
        setTimeout(function () {
            emitter.emit(args[0], args[1]);
        }, 5);
    });
});
