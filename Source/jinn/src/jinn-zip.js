/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * Compression of network traffic
 *
**/
'use strict';
global.JINN_MODULES.push({InitClass:InitClass});

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
            Child.WriterZip.WorkNum = Child.WorkNum;
        }
        Child.EncodeZip.write(Buffer.from(Data));
    };
    Engine.PrepareOnReceiveZip = function (Child,Chunk)
    {
        let DecodeZip = Child.DecodeZip;
        if(!DecodeZip)
        {
            DecodeZip = zlib.createGunzip({flush:zlib.constants.Z_SYNC_FLUSH, chunkSize:JINN_CONST.MAX_PACKET_LENGTH});
            Child.WriterUnZip = new Writable({objectMode:true, write:function (chunk,encoding,callback)
                {
                    callback(0);
                    Engine.PrepareOnReceive(Child, chunk);
                }});
            DecodeZip.pipe(Child.WriterUnZip);
            DecodeZip.on('error', function (err)
            {
                Child.ToError("DecodeZip packet=" + Child.ReceivePacketCount + " work=" + Child.WriterUnZip.WorkNum + "/" + Child.WorkNum + " " + err);
            });
            Child.WriterUnZip.WorkNum = Child.WorkNum;
            Child.DecodeZip = DecodeZip;
        }
        DecodeZip.write(Chunk);
    };
}
