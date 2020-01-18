/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * Adaptation of the JINN library with the TERA blockchain
 *
 **/
'use strict';
require("../src");
global.JINN_WARNING = 3;
JINN_CONST.MAX_LEADER_COUNT = 4;
JINN_CONST.CONSENSUS_PERIOD_TIME = CONSENSUS_PERIOD_TIME;
JINN_CONST.START_CHECK_BLOCKNUM = 50;
JINN_CONST.SHARD_NAME = "TERA";
JINN_CONST.MAX_PACKET_LENGTH = global.MAX_PACKET_LENGTH;
JINN_CONST.BLOCK_GENESIS_COUNT = global.BLOCK_GENESIS_COUNT;
JINN_CONST.DELTA_BLOCKS_FOR_LOAD_ONLY = JINN_CONST.BLOCK_GENESIS_COUNT + 10;
JINN_CONST.MAX_DELTA_PROCESSING = 2;
JINN_CONST.MAX_ITEMS_FOR_LOAD = 100;
JINN_CONST.MAX_BLOCK_SIZE = MAX_BLOCK_SIZE;
JINN_CONST.MAX_DEPTH_FOR_SECONDARY_CHAIN = 100;
JINN_CONST.CACHE_PERIOD_FOR_INVALIDATE = 30;
JINN_EXTERN.GetCurrentBlockNumByTime = global.GetCurrentBlockNumByTime;
JINN_CONST.BLOCKNUM_TICKET_ALGO = global.BLOCKNUM_TICKET_ALGO;
module.exports.Create = function (Node)
{
    var Engine = {};
    Engine.ID = Node.port % 1000;
    Engine.ip = Node.ip;
    Engine.port = Node.port;
    Engine.IDArr = CalcIDArr(Engine.ip, Engine.port);
    Engine.IDStr = GetHexFromArr(Engine.IDArr);
    global.CreateNodeEngine(Engine);
    require("./tera-base").Init(Engine);
    require("./tera-db").Init(Engine);
    require("./tera-mining").Init(Engine);
    require("./tera-stat").Init(Engine);
    function StartRun(Engine,Period)
    {
        setInterval(function ()
        {
            NextRunEngine(Engine);
        }, Period);
    };
    StartRun(Engine, 100);
    Engine.AddNodeAddr({ip:"127.0.0.1", port:50001});
}
