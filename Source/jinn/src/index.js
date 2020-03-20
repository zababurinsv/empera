/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * Starting point of the launch. Setting default constants.
 *
**/
'use strict';

if(typeof global !== "object")
    global = window;

global.ZERO_ARR_32 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
global.MAX_ARR_32 = [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255];

global.JINN_MODULES = [];

if(typeof window !== "object")
{
    
    if(!global.sha3)
        require("../extlib/sha3.js");
    if(!global.RBTree)
        require("../extlib/RBTree.js");
    
    require("./terabuf.js");
    require("./jinn-log.js");
    require("./jinn-stat.js");
    require("./jinn-timing.js");
    if(global.EMULATE_FILE)
        require("./db/jinn-db-file.js");
    require("./db/jinn-db-row.js");
    require("./db/jinn-db-item.js");
    require("./db/jinn-db-chain.js");
    require("./db/cache.js");
    require("./db/jinn-db-cache-body.js");
    require("./db/jinn-db-cache-block.js");
    require("./db/jinn-db-result.js");
    require("./jinn-block-db.js");
    require("./jinn-connect.js");
    require("./jinn-connect-item.js");
    require("./jinn-connect-handshake.js");
    require("./jinn-connect-addr.js");
    require("./jinn-connect-hot.js");
    
    require("./jinn-tx.js");
    require("./jinn-ticket.js");
    require("./jinn-tx-control.js");
    
    require("./jinn-block.js");
    require("./jinn-consensus-chain.js");
    require("./jinn-consensus.js");
    require("./jinn-consensus-boost.js");
    require("./jinn-net-cache.js");
    
    require("./jinn-net.js");
    require("./jinn-serialize.js");
    require("./jinn-zip.js");
    require("./jinn-filter.js");
    require("./jinn-net-socket.js");
}

global.JINN_WARNING = 3;
global.DEBUG_ID = 0;


global.JINN_EXTERN = {GetCurrentBlockNumByTime:function ()
    {
        return 0;
    }};

if(global.DELTA_CURRENT_TIME === undefined)
    global.DELTA_CURRENT_TIME = 0;

global.JINN_NET_CONSTANT = {NetConstVer:0};
global.CODE_VERSION = {VersionNum:0};



global.JINN_CONST = {};

JINN_CONST.UNIQUE_IP_MODE = 0;
JINN_CONST.MIN_COUNT_FOR_CORRECT_TIME = 30;
JINN_CONST.CORRECT_TIME_VALUE = 50;
JINN_CONST.CORRECT_TIME_TRIGGER = 1200;

JINN_CONST.START_CHECK_BLOCKNUM = 20;
JINN_CONST.START_ADD_TX = 20;

JINN_CONST.CONSENSUS_PERIOD_TIME = 1000;



JINN_CONST.MAX_BLOCK_SIZE = 130 * 1024;
JINN_CONST.BLOCK_GENESIS_COUNT = 16;
JINN_CONST.START_BLOCK_NUM = JINN_CONST.BLOCK_GENESIS_COUNT + 4;
JINN_CONST.DELTA_BLOCKS_FOR_LOAD_ONLY = JINN_CONST.START_BLOCK_NUM + 10;
JINN_CONST.DELTA_BLOCKS_FOR_CREATE = 5;
JINN_CONST.PROTOCOL_NAME = "TERA_PROTOCOL 2.0";
JINN_CONST.PROTOCOL_MODE = 0;
JINN_CONST.SHARD_NAME = "TEST";


JINN_CONST.MAX_RET_NODE_LIST = 100;
JINN_CONST.MAX_LEVEL_CONNECTION = 10;
JINN_CONST.MAX_LEVEL_NODES = 30;
JINN_CONST.EXTRA_SLOTS_START_TIME = 500;
JINN_CONST.EXTRA_SLOTS_COUNT = 8;


JINN_CONST.MAX_PACKET_SIZE = 256 * 1024;
JINN_CONST.MAX_PACKET_SIZE_RET_DATA = Math.floor(JINN_CONST.MAX_PACKET_SIZE / 2);

JINN_CONST.MAX_WAIT_PERIOD_FOR_STATUS = 10 * 1000;


JINN_CONST.MAX_LEADER_COUNT = 4;


JINN_CONST.CACHE_PERIOD_FOR_INVALIDATE = 5;


JINN_CONST.TX_TICKET_HASH_LENGTH = 10;
JINN_CONST.MAX_TRANSACTION_COUNT = 1500;


JINN_CONST.CACHE_DB_LENGTH = 50;
JINN_CONST.MAX_CACHE_DB_LENGTH = 120;




JINN_CONST.MAX_ITEMS_FOR_LOAD = 100;
JINN_CONST.MAX_DEPTH_FOR_SECONDARY_CHAIN = 100;


JINN_CONST.LINK_HASH_PREV_HASHSUM = 0;
JINN_CONST.LINK_HASH_DELTA = 1;

JINN_CONST.MAX_DELTA_PROCESSING = 1;

JINN_CONST.STEP_ADDTX = 0;
JINN_CONST.STEP_TICKET = 1;
JINN_CONST.STEP_TX = 2;
JINN_CONST.STEP_MINING = 3;
JINN_CONST.STEP_MAXHASH = 4;
JINN_CONST.STEP_LAST = 7;
JINN_CONST.STEP_CLEAR_MEM = 30;

function CreateNodeEngine(Engine,MapName)
{
    for(var i = 0; i < global.JINN_MODULES.length; i++)
    {
        var module = global.JINN_MODULES[i];
        if(MapName && (!module.Name || !MapName[module.Name]))
            continue;
        module.USE_MODULE = 1;
        if(module.InitClass)
            module.InitClass(Engine);
    }
    for(var i = 0; i < global.JINN_MODULES.length; i++)
    {
        var module = global.JINN_MODULES[i];
        if(MapName && (!module.Name || !MapName[module.Name]))
            continue;
        if(module.InitAfter)
            module.InitAfter(Engine);
    }
}

function NextRunEngine(NetNodeArr)
{
    
    for(var i = 0; i < global.JINN_MODULES.length; i++)
    {
        var module = global.JINN_MODULES[i];
        if(!module.USE_MODULE)
            continue;
        
        if(module.DoRun)
            module.DoRun();
        
        if(module.DoNodeFirst)
        {
            if(NetNodeArr.ID !== undefined)
                module.DoNodeFirst(NetNodeArr);
            else
                for(var n = 0; n < NetNodeArr.length; n++)
                {
                    var Node = NetNodeArr[n];
                    if(!Node.Del)
                        module.DoNodeFirst(Node);
                }
        }
    }
    
    for(var i = 0; i < global.JINN_MODULES.length; i++)
    {
        var module = global.JINN_MODULES[i];
        if(!module.USE_MODULE)
            continue;
        
        if(module.DoNode)
        {
            if(NetNodeArr.ID !== undefined)
                module.DoNode(NetNodeArr);
            else
                for(var n = 0; n < NetNodeArr.length; n++)
                {
                    var Node = NetNodeArr[n];
                    if(!Node.Del)
                        module.DoNode(Node);
                }
        }
    }
}

global.CreateNodeEngine = CreateNodeEngine;
global.NextRunEngine = NextRunEngine;
