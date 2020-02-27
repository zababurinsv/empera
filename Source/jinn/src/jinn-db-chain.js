/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * A record of all downloadable combinations of blocks in the database
 *
**/

'use strict';
global.JINN_MODULES.push({InitClass:InitClass, DoNode:DoNode});

global.DB_CHAIN_FORMAT = {BlockNum:"uint", StartVersion:"uint32", ArrBlock:[{BlockNum:"uint", LinkData:"hash", LinkRef:"hash",
        TreeHash:"hash", MinerHash:"hash", PrevBlockHash:"hash", SumPow:"uint", TxData:[{HASH:"hash", HashPow:"hash", body:"tr"}],
        BodyLinkVer:"uint", FirstEmptyBodyNum:"uint", FirstEmptyBodyHash:"hash", HeadNum:"uint", HeadRow:"uint16", HeadDeltaSum:"uint",
        VersionDB:"byte", StartVersion:"uint32", }]};
const DB_CHAIN_FORMATWRK = {};

function DoNode(Engine)
{
    if(Engine.TickNum % 10 !== 0)
        return ;
}

//Engine context

function InitClass(Engine)
{
    
    Engine.InitChainDB = function ()
    {
        Engine.ChainDBBlockMin = 0;
        Engine.ChainDBArr = {};
    };
    Engine.ClearChainDB = function ()
    {
        Engine.InitChainDB();
    };
    
    Engine.WriteChainToDB = function (Chain)
    {
        if(Chain.BlockNum < 1)
            return ;
        if(Chain.BlockNum < Engine.ChainDBBlockMin)
            Engine.ChainDBBlockMin = Chain.BlockNum;
        
        var Buf = SerializeLib.GetBufferFromObject(Chain, DB_CHAIN_FORMAT, DB_CHAIN_FORMATWRK);
        Engine.ChainDBArr[Chain.BlockNum] = Buf;
    };
    Engine.ReadChainFromDB = function (BlockNum)
    {
        if(BlockNum < 1)
            return undefined;
        
        var Buf = Engine.ChainDBArr[BlockNum];
        if(!Buf)
            return undefined;
        
        var Chain = SerializeLib.GetObjectFromBuffer(Buf, DB_CHAIN_FORMAT, DB_CHAIN_FORMATWRK);
        if(!Chain)
            return undefined;
        
        if(Chain.BlockNum !== BlockNum)
            ToLog("Err Chain.BlockNum=" + Chain.BlockNum + "/" + BlockNum);
        
        for(var n = 0; n < Chain.ArrBlock.length; n++)
        {
            var Block = Chain.ArrBlock[n];
            if(Block.BlockNum !== BlockNum)
                ToLog("Block.BlockNum!==BlockNum: " + Block.BlockNum + "/" + BlockNum);
            Engine.CalcBlockHash(Block);
            for(var i = 0; i < Block.TxData.length; i++)
            {
                var Element = Block.TxData[i];
                var Tx = Engine.GetTx(Element.body, Element.HASH, Element.HashPow);
                Block.TxData[i] = Tx;
                CheckTx("ReadChainFromDB:" + n, Tx, Block.BlockNum, 1);
            }
            
            if(!IsZeroArr(Block.TreeHash) && (Block.TxData && Block.TxData.length === 0))
                Block.TxData = undefined;
        }
        
        return Chain;
    };
    
    Engine.GetMaxChainDBNum = function ()
    {
        return Engine.ChainDBArr.length;
    };
    Engine.InitChainDB();
}
