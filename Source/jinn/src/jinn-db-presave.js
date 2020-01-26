/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * Pre-recording blocks in the database
 *
**/
'use strict';
global.JINN_MODULES.push({InitClass:InitClass, DoNode:DoNode});
function DoNode(Engine)
{
    if(Engine.TickNum % 10 !== 0)
        return ;
    Engine.RemoveOldChain();
}
function InitClass(Engine)
{
    Engine.InitPresaveDB = function ()
    {
        Engine.ArrPresaveDB = [];
        Engine.ChainDBBlockMin = 0;
        Engine.ChainDBArr = {};
    };
    Engine.WriteChainItemToDB = function (Item)
    {
        Item.SaveTime = Date.now();
        Engine.ChainDBArr[Item.BlockNum] = Item;
        if(Item.BlockNum < Engine.ChainDBBlockMin)
            Engine.ChainDBBlockMin = Item.BlockNum;
    };
    Engine.ReadChainItemFromDB = function (BlockNum)
    {
        var Item = Engine.ChainDBArr[BlockNum];
        return Item;
    };
    Engine.GetMinBlockNumLoad = function ()
    {
        var MinBlockNum = Engine.Header1;
        var CurBlockNum = JINN_EXTERN.GetCurrentBlockNumByTime();
        for(var num = 0; num < JINN_CONST.MAX_CHAIN_IN_MEMORY; num++)
        {
            var BlockNum = CurBlockNum - num;
            if(BlockNum < 0)
                break;
            var Store = Engine.GetStoreAtNum(BlockNum);
            for(var n = 0; n < Store.LiderArr.length; n++)
            {
                var NodeStatus = Store.LiderArr[n];
                if(NodeStatus.LoadNum)
                {
                    if(MinBlockNum === undefined || MinBlockNum > NodeStatus.LoadNum)
                        MinBlockNum = NodeStatus.LoadNum;
                }
            }
        }
        return MinBlockNum;
    };
    Engine.RemoveOldChain = function ()
    {
        var MinBlockNum = Engine.GetMinBlockNumLoad();
        if(!MinBlockNum)
            return ;
        MinBlockNum = MinBlockNum - JINN_CONST.CHAINDB_MARGIN_CLEAR;
        var CurTime = Date.now();
        var RemoveCount = 0;
        for(var i = 0; i < JINN_CONST.CHAINDB_COUNT_CLEAR; i++)
        {
            var BlockNum = Engine.ChainDBBlockMin;
            if(BlockNum >= MinBlockNum)
                break;
            var Chain = Engine.ChainDBArr[BlockNum];
            if(Chain)
            {
                if(CurTime - Chain.SaveTime < JINN_CONST.CHAINDB_MIN_TIME_CLEAR)
                    break;
                RemoveCount++;
                for(var j = 0; j < Chain.ArrBlock.length; j++)
                    Chain.ArrBlock[j].HeadLinkVer = 0;
                Engine.ChainDBArr[BlockNum] = undefined;
            }
            Engine.ChainDBBlockMin++;
        }
    };
    Engine.PreSaveToDB = function (Block)
    {
        Engine.ToLog("PreSaveToDB  Block:" + Block.BlockNum);
        var Buf = SerializeLib.GetBufferFromObject(Block, DB_BLOCK_FORMAT, DB_BLOCK_FORMATWRK);
        Engine.ArrPresaveDB[Block.BlockNum] = Buf;
    };
    Engine.PreLoadFromDB = function (BlockNum)
    {
        Engine.ToLog("PreLoadFromDB  Block:" + BlockNum);
        var Buf = Engine.ArrPresaveDB[BlockNum];
        if(!Buf)
            return undefined;
        var BlockDB = SerializeLib.GetObjectFromBuffer(Buf, DB_BLOCK_FORMAT, DB_BLOCK_FORMATWRK);
        if(!BlockDB)
            throw "Error GetBlockDB";
        for(var i = 0; i < BlockDB.TxData.length; i++)
        {
            var Item = BlockDB.TxData[i];
            var Tx = Engine.GetTx(Item.body, Item.HASH, Item.HashPow);
            BlockDB.TxData[i] = Tx;
            CheckTx("GetBlockDB", Tx, BlockNum);
        }
        Engine.CalcBlockHash(BlockDB);
        return BlockDB;
    };
    Engine.InitPresaveDB();
}
