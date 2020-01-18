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
global.JINN_MODULES = [];
global.JINN_WARNING = 3;
global.DEBUG_ID = 0;
global.JINN_STAT = {AllTraffic:0, TxSend:0, TTSend:0, HeaderSend:0, BodySend:0, BodyTxSend:0, SaveDB:0, LoadDB:0, LoadHDB:0,
    CheckSave:0, FindHeadCount:0, FindHeadCount0:0};
JINN_STAT.Clear = function ()
{
    for(var key in JINN_STAT)
        if(typeof JINN_STAT[key] === "number")
            JINN_STAT[key] = 0;
}
global.JINN_EXTERN = {GetCurrentBlockNumByTime:function ()
    {
        return 0;
    }};
global.JINN_CONST = {};
JINN_CONST.START_CHECK_BLOCKNUM = 20;
JINN_CONST.START_ADD_TX = 20;
JINN_CONST.CONSENSUS_PERIOD_TIME = 1000;
JINN_CONST.MAX_BLOCK_SIZE = 130 * 1024;
JINN_CONST.BLOCK_GENESIS_COUNT = 16;
JINN_CONST.START_BLOCK_NUM = JINN_CONST.BLOCK_GENESIS_COUNT + 4;
JINN_CONST.DELTA_BLOCKS_FOR_LOAD_ONLY = JINN_CONST.START_BLOCK_NUM + 10;
JINN_CONST.DELTA_BLOCKS_FOR_CREATE = 10;
JINN_CONST.PROTOCOL_NAME = "TERA_PROTOCOL 2.0";
JINN_CONST.SHARD_NAME = "TEST";
JINN_CONST.MAX_ACTIVE_COUNT = 30;
JINN_CONST.MAX_RET_NODE_LIST = 100;
JINN_CONST.MAX_LEVEL_CONNECTION = 20;
JINN_CONST.MAX_LEVEL_NODES = 30;
JINN_CONST.MAX_PACKET_LENGTH = 256 * 1024;
JINN_CONST.MAX_WAIT_PERIOD_FOR_STATUS = 10 * 1000;
JINN_CONST.MAX_LEADER_COUNT = 4;
JINN_CONST.MAX_ITEMS_FOR_LOAD = 100;
JINN_CONST.MAX_DEPTH_FOR_SECONDARY_CHAIN = 100;
JINN_CONST.CACHE_PERIOD_FOR_INVALIDATE = 30;
JINN_CONST.TX_TICKET_HASH_LENGTH = 10;
JINN_CONST.MAX_TRANSACTION_COUNT = 5;
JINN_CONST.MAX_CACHE_DB_LENGTH = 50;
JINN_CONST.MAX_DELTA_PROCESSING = 1;
JINN_CONST.STEP_ADDTX = 0;
JINN_CONST.STEP_TICKET = 1;
JINN_CONST.STEP_TX = 2;
JINN_CONST.STEP_MINING = 3;
JINN_CONST.STEP_MAXHASH = 4;
JINN_CONST.STEP_LAST = 5;
JINN_CONST.STEP_CLEAR_MEM = 30;
function CreateNodeEngine(Engine,MapName)
{
    for(var i = 0; i < global.JINN_MODULES.length; i++)
    {
        var module = global.JINN_MODULES[i];
        if(MapName && (!module.Name || !MapName[module.Name]))
            continue;
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
        if(module.DoRun)
            module.DoRun();
        if(module.DoNodeFirst)
        {
            if(NetNodeArr.ID)
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
        if(module.DoNode)
        {
            if(NetNodeArr.ID)
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
