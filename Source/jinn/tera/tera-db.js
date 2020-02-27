/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

module.exports.Init = Init;

global.StartVersion = 1;

function Init(Engine)
{
    
    let ClearDataBaseOld = SERVER.ClearDataBase.bind(SERVER);
    let TruncateBlockDBOld = SERVER.TruncateBlockDB.bind(SERVER);
    SERVER.ClearDataBase = function ()
    {
        ClearDataBaseOld();
        Engine.ClearDataBase();
        StartVersion++;
    };
    SERVER.TruncateBlockDB = function (StartNum)
    {
        TruncateBlockDBOld(StartNum);
        ToLog("TruncateBlockDB : " + StartNum);
    };
    
    Engine.GetMaxNumBlockDB = function ()
    {
        return SERVER.GetMaxNumBlockDB();
    };
    Engine.WriteBlockDBInner = function (Block,aaa,bMining)
    {
        Engine.ConvertToTera(Block, 1);
        
        var Result = SERVER.WriteBlockDB(Block);
        if(Result)
        {
            var CurBlockNum = JINN_EXTERN.GetCurrentBlockNumByTime();
            if(Block.BlockNum > CurBlockNum - 100 && Block.arrContent && Block.arrContent.length)
                ADD_TO_STAT("MAX:TRANSACTION_COUNT", Block.arrContent.length);
        }
        else
        {
        }
        return Result;
    };
    
    Engine.GetBlockDBInner = function (BlockNum)
    {
        var Block = SERVER.ReadBlockDB(BlockNum);
        if(!Block)
            return Block;
        
        Engine.ConvertFromTera(Block, 1, 1);
        
        return Block;
    };
    Engine.GetBlockHeaderDBInner = function (BlockNum,bRawMode)
    {
        var Block = SERVER.ReadBlockHeaderDB(BlockNum);
        if(!Block)
            return Block;
        if(!bRawMode)
            Engine.ConvertFromTera(Block, 0, 1);
        
        return Block;
    };
    Engine.SetBlockData = function (BlockDst,BlockSrc)
    {
        BlockDst.TxData = BlockSrc.TxData;
        Engine.SetChainListForSave(BlockDst.BlockNum);
        BlockDst.TrDataPos = BlockSrc.TrDataPos;
        BlockDst.TrDataLen = BlockSrc.TrDataLen;
    };
}
