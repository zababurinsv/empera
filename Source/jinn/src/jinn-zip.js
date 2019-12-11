/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2019 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

global.JINN_MODULES.push({InitClass:InitClass});
'use strict';
const zlib = require('zlib');
const Writable = require('stream').Writable;
global.glUseZip = 1;
function InitClass(Engine)
{
    Engine.PrepareOnSendZip = function (Child,Data)
    {
        if(!Child.EncodeZip)
        {
            const level = zlib.constants.Z_BEST_SPEED;
            Child.EncodeZip = zlib.createGzip({flush:zlib.constants.Z_SYNC_FLUSH, chunkSize:JINN_CONST.MAX_PACKET_LENGTH, level:level});
            Child.WriterZip = new Writable({objectMode:true, write:function (chunk,encoding,callback)
                {
                    callback(0);
                    Engine.SendToNetwork(Child, chunk);
                }});
            Child.EncodeZip.pipe(Child.WriterZip);
            Child.EncodeZip.on('error', function (err)
            {
                Child.ToError("EncodeZip: " + err);
            });
        }
        Child.EncodeZip.write(Buffer.from(Data));
    };
    Engine.PrepareOnReceiveZip = function (Child,Chunk)
    {
        if(!Child.DecodeZip)
        {
            Child.DecodeZip = zlib.createGunzip({flush:zlib.constants.Z_SYNC_FLUSH, chunkSize:JINN_CONST.MAX_PACKET_LENGTH});
            Child.WriterUnZip = new Writable({objectMode:true, write:function (chunk,encoding,callback)
                {
                    callback(0);
                    Engine.PrepareOnReceive(Child, chunk);
                }});
            Child.DecodeZip.pipe(Child.WriterUnZip);
            Child.DecodeZip.on('error', function (err)
            {
                Child.ToError("DecodeZip: " + err);
            });
        }
        Child.DecodeZip.write(Chunk);
    };
}
