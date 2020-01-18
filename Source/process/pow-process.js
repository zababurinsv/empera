/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

global.PROCESS_NAME = "POW";
global.POWPROCESS = 1;
require("../core/library");
require("../core/crypto-library");
require("../core/terahashmining");
var PROCESS = process;
if(process.send && !global.DEBUGPROCESS)
{
    process.send({cmd:"online", message:"OK"});
}
else
{
    PROCESS = global.DEBUGPROCESS;
}
var LastAlive = Date.now();
setInterval(CheckAlive, 1000);
var idInterval = undefined;
var Block = {};
PROCESS.on('message', function (msg)
{
    LastAlive = Date.now();
    if(msg.cmd === "FastCalcBlock")
    {
        var FastBlock = msg;
        StartHashPump(FastBlock);
        FastBlock.RunCount = 0;
        try
        {
            if(CreatePOWVersionX(FastBlock))
                process.send({cmd:"POW", BlockNum:FastBlock.BlockNum, SeqHash:FastBlock.SeqHash, Hash:FastBlock.Hash, PowHash:FastBlock.PowHash,
                    AddrHash:FastBlock.AddrHash, Num:FastBlock.Num});
        }
        catch(e)
        {
            ToError(e);
        }
    }
    else
        if(msg.cmd === "Alive")
        {
        }
        else
            if(msg.cmd === "Exit")
            {
                PROCESS.exit(0);
            }
}
);
function CheckAlive()
{
    if(global.NOALIVE)
        return ;
    var Delta = Date.now() - LastAlive;
    if(Math.abs(Delta) > CHECK_STOP_CHILD_PROCESS)
    {
        PROCESS.exit(0);
        return ;
    }
}
function CalcPOWHash()
{
    if(!Block.SeqHash)
        return ;
    if(new Date() - Block.Time > Block.Period)
    {
        clearInterval(idInterval);
        idInterval = undefined;
        return ;
    }
    try
    {
        if(CreatePOWVersionX(Block))
            process.send({cmd:"POW", BlockNum:Block.BlockNum, SeqHash:Block.SeqHash, Hash:Block.Hash, PowHash:Block.PowHash, AddrHash:Block.AddrHash,
                Num:Block.Num});
    }
    catch(e)
    {
        ToError(e);
    }
}
global.BlockPump = undefined;
var idIntervalPump = undefined;
function StartHashPump(SetBlock)
{
    if(!BlockPump || BlockPump.BlockNum < SetBlock.BlockNum || BlockPump.MinerID !== SetBlock.MinerID || BlockPump.Percent !== SetBlock.Percent)
    {
        global.BlockPump = {BlockNum:SetBlock.BlockNum, RunCount:SetBlock.RunCount, MinerID:SetBlock.MinerID, Percent:SetBlock.Percent,
            LastNonce:0, };
    }
    if(!idIntervalPump)
    {
        idIntervalPump = setInterval(PumpHash, global.POWRunPeriod);
    }
}
var StartTime = 1;
var EndTime = 0;
function PumpHash()
{
    if(!BlockPump)
        return ;
    var CurTime = Date.now();
    if(StartTime > EndTime)
    {
        var Delta = CurTime - StartTime;
        var PeriodPercent = 100 * Delta / CONSENSUS_PERIOD_TIME;
        if(PeriodPercent >= BlockPump.Percent)
        {
            EndTime = CurTime;
            return ;
        }
        CreatePOWVersionX(BlockPump, 1);
    }
    else
    {
        var Delta = CurTime - EndTime;
        var PeriodPercent = 100 * Delta / CONSENSUS_PERIOD_TIME;
        if(PeriodPercent > 100 - BlockPump.Percent)
        {
            StartTime = CurTime;
        }
    }
}
