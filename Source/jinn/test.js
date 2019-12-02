/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2019 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

require("./src");
require("./model/model-lib.js");
require("./model/model-network.js");
require("./model/model-node.js");
require("./model/model-environment.js");
var PrevCurBlockNum = 0;
global.DEBUG_ID = 0;
JINN_CONST.START_ADD_TX = 20;
var MaxNode = 10;
JINN_CONST.MAX_TRANSACTION_COUNT = 0;
global.CREATE_TX_PER_NODE = Math.floor(0.99 + JINN_CONST.MAX_TRANSACTION_COUNT / MaxNode);
global.glUseZip = 1;
global.glUseTicket = 1;
global.glUseBlockCache = 1;
JINN_CONST.MAX_LEADER_COUNT = 4;
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
        var Count = MODEL.CalcMaxConsensusHash(1);
        var StrErr = "";
        if(Count !== MODEL.NodeCount)
            StrErr = "  <------ NO CONSENSUS";
        var Traffic = (JINN_STAT.AllTraffic / 1024 / MODEL.NodeCount).toFixed(1);
        var Str = "" + CurBlockNum + ". Consensus OK:" + Count + "/" + MODEL.NodeCount + " Traffic:" + Traffic + " Kb" + " Tx:" + Math.floor(JINN_STAT.TxSend / MODEL.NodeCount) + " Tt:" + Math.floor(JINN_STAT.TTSend / MODEL.NodeCount) + " Head:" + Math.floor(JINN_STAT.HeaderSend / MODEL.NodeCount) + " Body:" + Math.floor(JINN_STAT.BodySend / MODEL.NodeCount) + " BodyTx:" + Math.floor(JINN_STAT.BodyTxSend / MODEL.NodeCount);
        ToLog(Str + StrErr);
        JINN_STAT.Clear();
        PrevCurBlockNum = CurBlockNum;
    }
}
