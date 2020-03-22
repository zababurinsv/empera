/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


'use strict';
module.exports.Init = Init;

function Init(Engine)
{
    
    SERVER.CheckOnStartComplete = 1;
    
    SERVER.BlockNumDBMin = 0;
    Object.defineProperty(SERVER, "BlockNumDB", {set:function (x)
        {
        }, get:function (x)
        {
            return Engine.GetMaxNumBlockDB();
        }, });
    
    SERVER.AddTransaction = function (Tr,ToAll)
    {
        var Tx = Engine.GetTx(Tr.body);
        
        if(!Engine.IsValidateTx(Tx, "ERROR SERVER.AddTransaction", Tx.num))
            return  - 4;
        
        var CurBlockNum = JINN_EXTERN.GetCurrentBlockNumByTime();
        
        if(Tx.num < CurBlockNum)
            return  - 3;
        if(Tx.num > CurBlockNum + 20)
            return  - 5;
        
        if(ToAll)
            var Stop = 1;
        Engine.AddCurrentProcessingTx(Tx.num, [Tx]);
        
        return 1;
    };
    let CloseOld = SERVER.Close.bind(SERVER);
    SERVER.ClearDataBase = function ()
    {
        if(global.TX_PROCESS && global.TX_PROCESS.RunRPC)
            global.TX_PROCESS.RunRPC("ClearDataBase", {});
        
        Engine.ClearDataBase();
    };
    SERVER.Close = function ()
    {
        CloseOld();
        Engine.Close();
    };
    
    SERVER.WriteBlockDB = function (Block)
    {
        Engine.ConvertFromTera(Block, 1);
        return Engine.SaveToDB(Block);
    };
    SERVER.WriteBlockHeaderDB = function (Block,bPreSave)
    {
        Engine.ConvertFromTera(Block);
        return Engine.SaveToDB(Block);
    };
    
    SERVER.ReadBlockDB = function (BlockNum)
    {
        var Block = Engine.GetBlockDB(BlockNum);
        Engine.ConvertToTera(Block, 1);
        return Block;
    };
    
    SERVER.CheckLoadBody = function (Block)
    {
        Engine.CheckLoadBody(Block);
        Engine.ConvertToTera(Block, 1);
    };
    
    SERVER.ReadBlockHeaderDB = function (BlockNum)
    {
        var Block = Engine.GetBlockHeaderDB(BlockNum);
        Engine.ConvertToTera(Block, 0);
        return Block;
    };
    SERVER.ReadBlockHeaderFromMapDB = SERVER.ReadBlockHeaderDB;
    
    SERVER.TruncateBlockDB = function (LastNum)
    {
        return Engine.TruncateDB(LastNum);
    };
    
    SERVER.GetMaxNumBlockDB = function ()
    {
        return Engine.GetMaxNumBlockDB();
    };
    
    SERVER.FindStartBlockNum222 = function ()
    {
        return Engine.GetMaxNumBlockDB();
    };
    
    function ErrorAPICall()
    {
        ToLogTrace("Error API call");
        return 0;
    };
    function ErrorTODO()
    {
        ToLogTrace("TODO");
        return 0;
    };
    
    SERVER.WriteBlockDBFinaly = ErrorAPICall;
    SERVER.WriteBodyDB = ErrorAPICall;
    
    SERVER.WriteBodyResultDB = ErrorTODO;
    
    SERVER.CreateGenesisBlocks = function ()
    {
    };
    SERVER.CheckStartedBlocks = function ()
    {
        var CurNumTime = GetCurrentBlockNumByTime();
        if(SERVER.BlockNumDB > CurNumTime)
        {
            SERVER.TruncateBlockDB(CurNumTime);
        }
        var BlockNum = SERVER.CheckBlocksOnStartReverse(SERVER.BlockNumDB);
        BlockNum = SERVER.CheckBlocksOnStartFoward(BlockNum - 3000, 0);
        
        if(BlockNum < SERVER.BlockNumDB)
        {
            ToLog("******************************** SET NEW BlockNumDB = " + BlockNum + "/" + SERVER.BlockNumDB);
            SERVER.TruncateBlockDB(BlockNum);
        }
    };
    
    SERVER.GetLinkHash = ErrorAPICall;
    
    SERVER.GetLinkHashDB = function (Block)
    {
        return Engine.GetLinkDataFromDB(Block);
    };
}
