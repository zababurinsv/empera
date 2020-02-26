/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


'use strict';
require("./model/model-lib.js");


require("./src");



require("./model/model-node.js");
require("./model/model-network.js");
require("./model/model-environment.js");

var PrevCurBlockNum = 0;

global.JINN_WARNING = 2;
global.DEBUG_ID = undefined;


JINN_CONST.START_ADD_TX = 20;

var MaxNode = 8;
JINN_CONST.MAX_TRANSACTION_COUNT = 1;
global.CREATE_TX_PER_NODE = Math.floor(0.999 + JINN_CONST.MAX_TRANSACTION_COUNT / MaxNode);

JINN_CONST.MAX_LEADER_COUNT = 4;



global.glUseZip = 1;
global.glUseTicket = 1;
global.glUseBlockCache = 1;


JINN_CONST.MAX_DELTA_PROCESSING = 1;


JINN_CONST.MAX_PACKET_LENGTH = 260 * 1024;

JINN_CONST.MAX_LEVEL_CONNECTION = 15;
JINN_CONST.MAX_ACTIVE_COUNT = 40;

JINN_CONST.TX_TICKET_HASH_LENGTH = 10;
JINN_CONST.MAX_BLOCK_SIZE = 420 * 1000;

var MODEL = CreateModel(MaxNode);
ToLog("MaxNodeCount=" + MODEL.MaxNodeCount);
setInterval(MainWorkLoop, 100);

function MainWorkLoop()
{
    MODEL.DoRun();
    
    var CurBlockNum = JINN_EXTERN.GetCurrentBlockNumByTime();
    if(CurBlockNum !== PrevCurBlockNum && MODEL.NodeCount)
    {
        var Stat = MODEL.CalcNodesStat(1);
        
        var StrErr = "";
        if(Stat.Consensus !== MODEL.NodeCount)
            StrErr = "  <------ NO CONSENSUS";
        var Str = "" + CurBlockNum + ". Consensus OK:" + Stat.Consensus + "/" + MODEL.NodeCount + " " + MODEL.GetInfoString();
        Str = Str.replace(/[\n]/g, " ");
        
        ToLog(Str + StrErr);
        
        JINN_STAT.Clear();
        PrevCurBlockNum = CurBlockNum;
    }
}
