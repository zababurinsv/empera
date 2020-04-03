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


global.CDBFile = require("../../core/db/db-file");
require("../src");


var BWRITE_MODE_TX = (global.PROCESS_NAME === "TX");


global.JINN_WARNING = 3;



JINN_CONST.CACHE_DB_LENGTH = 120;

global.UPDATE_CODE_JINN_1 = JINN_CONST.BLOCK_GENESIS_COUNT;
JINN_CONST.LINK_HASH_PREV_HASHSUM = global.UPDATE_CODE_JINN_1;

JINN_CONST.BLOCK_PROCESSING_LENGTH = global.BLOCK_PROCESSING_LENGTH;

JINN_CONST.CONSENSUS_PERIOD_TIME = CONSENSUS_PERIOD_TIME;
JINN_CONST.START_CHECK_BLOCKNUM = 50;


JINN_CONST.SHARD_NAME = "TERA";



JINN_CONST.MAX_PACKET_SIZE = global.MAX_PACKET_LENGTH;
JINN_CONST.MAX_PACKET_SIZE_RET_DATA = Math.floor(JINN_CONST.MAX_PACKET_SIZE / 2);



JINN_CONST.BLOCK_GENESIS_COUNT = global.BLOCK_GENESIS_COUNT;
JINN_CONST.DELTA_BLOCKS_FOR_LOAD_ONLY = JINN_CONST.BLOCK_GENESIS_COUNT + 10;
JINN_CONST.MAX_DELTA_PROCESSING = 3;


JINN_CONST.MAX_ITEMS_FOR_LOAD = 500;

JINN_CONST.MAX_BLOCK_SIZE = MAX_BLOCK_SIZE;
JINN_CONST.MAX_DEPTH_FOR_SECONDARY_CHAIN = 100;

JINN_EXTERN.GetCurrentBlockNumByTime = global.GetCurrentBlockNumByTime;

module.exports.Create = function (Node,MapName)
{
    ToLog("JINN Starting...");
    if(global.LOCAL_RUN)
    {
        JINN_CONST.UNIQUE_IP_MODE = 0;
        global.AUTO_CORRECT_TIME = 0;
    }
    
    var Engine = {};
    Engine.DirectIP = 1;
    Engine.ID = Node.port % 1000;
    if(!Engine.ID)
        Engine.ID = 1;
    Engine.port = Node.port;
    Engine.IDArr = CalcIDArr(Engine.ip, Engine.port);
    Engine.IDStr = GetHexFromArr(Engine.IDArr);
    
    Engine.Header1 = 0;
    global.CreateNodeEngine(Engine, MapName);
    if(Engine.SetIP)
        Engine.SetIP(Node.ip);
    
    require("./tera-hash").Init(Engine);
    require("./tera-link").Init(Engine);
    
    require("./tera-net-constant").Init(Engine);
    require("./tera-code-updater").Init(Engine);
    
    require("./tera-mining").Init(Engine);
    require("./tera-stat").Init(Engine);
    
    require("./tera-tests").Init(Engine);
    
    if(Engine.AddNodeAddr)
    {
        if(global.LOCAL_RUN)
        {
            Engine.AddNodeAddr({ip:"127.0.0.1", port:50001});
        }
        else
        {
            Engine.AddNodeAddr({ip:"dappsgate.com", port:33000});
            Engine.AddNodeAddr({ip:"212.80.217.95", port:33006});
        }
    }
    
    global.Engine = Engine;
    global.JINN = Engine;
    
    StartRun();
}

const PERIOD_FOR_RUN = 100;

function StartRun()
{
    SERVER.NodeSyncStatus = {Header1:Engine.Header1, Header2:Engine.Header2, Block1:Engine.Block1, Block2:Engine.Block2, };
    NextRunEngine(global.JINN);
    
    var CurTimeNum =  + GetCurrentTime();
    var StartTimeNum = Math.floor((CurTimeNum + PERIOD_FOR_RUN) / PERIOD_FOR_RUN) * PERIOD_FOR_RUN;
    var DeltaForStart = StartTimeNum - CurTimeNum;
    if(DeltaForStart < PERIOD_FOR_RUN / 10)
        DeltaForStart += PERIOD_FOR_RUN;
    
    setTimeout(StartRun, DeltaForStart);
}
