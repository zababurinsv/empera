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
    Engine.GetTx = function (body,HASH,HashPow)
    {
        var Tx = {};
        Tx.IsTx = 1;
        Tx.num = ReadUintFromArr(body, body.length - 12);
        
        if(HASH)
            Tx.HASH = HASH;
        else
            if(Tx.num >= global.BLOCKNUM_TICKET_ALGO)
                Tx.HASH = sha3(body, 16);
            else
                Tx.HASH = shaarr(body);
        
        Tx.HashTicket = Tx.HASH.slice(0, JINN_CONST.TX_TICKET_HASH_LENGTH);
        Tx.KEY = GetHexFromArr(Tx.HashTicket);
        Tx.body = body;
        if(HashPow)
        {
            Tx.HashPow = HashPow;
            Tx.TimePow = GetPowPower(HashPow);
        }
        else
        {
            
            Engine.FillTicket(Tx);
        }
        
        return Tx;
    };
    
    Engine.GetGenesisBlock = function (BlockNum)
    {
        if(BlockNum >= JINN_CONST.BLOCK_GENESIS_COUNT)
        {
            ToLogTrace("Error GenesisBlock Num = " + BlockNum);
            return undefined;
        }
        
        var Block = SERVER.GenesisBlockHeaderDB(BlockNum);
        Engine.ConvertFromTera(Block, 1, 1);
        
        Engine.CalcBlockData(Block);
        
        return Block;
    };
    
    Engine.CalcBlockHash = function (Block)
    {
        if(!Block.PrevSumHash)
            ToLogTrace("Error No PrevSumHash on Block=" + Block.BlockNum);
        
        if(Block.BlockNum < JINN_CONST.BLOCK_GENESIS_COUNT)
        {
            Block.LinkSumHash = ZERO_ARR_32;
        }
        else
        {
            Block.LinkSumHash = Block.PrevSumHash;
        }
        
        if(!Block.TreeHash)
            ToLogTrace("No TreeHash on block " + Block.BlockNum);
        
        Block.DataHash = CalcDataHash(Block.LinkSumHash, Block.TreeHash, Block.BlockNum);
        CalcBlockHash(Block, Block.DataHash, Block.MinerHash, Block.BlockNum);
        
        if(Block.BlockNum < JINN_CONST.BLOCK_GENESIS_COUNT)
        {
            Block.Hash = ZERO_ARR_32.slice();
            Block.Hash[0] = 1 + Block.BlockNum;
            Block.Hash[31] = Block.Hash[0];
            Block.Power = GetPowPower(Block.Hash);
        }
        
        Block.SumPow = Block.PrevSumPow + Block.Power;
    };
    
    Engine.CalcSumHash = function (Block)
    {
        if(Block.BlockNum === 0)
            Block.SumHash = ZERO_ARR_32;
        else
        {
            if(!Block.PrevSumHash)
                ToLogTrace("Error No Block.PrevSumHash on Block=" + Block.BlockNum);
            
            Block.SumHash = CalcSumHash(Block.PrevSumHash, Block.Hash, Block.BlockNum, Block.SumPow);
        }
    };
    Engine.CalcHashMaxLiderInner = function (Data,BlockNum)
    {
        if(!Data.DataHash || IsZeroArr(Data.DataHash))
            ToLogTrace("ZERO DataHash on block:" + BlockNum);
        CalcBlockHash(Data, Data.DataHash, Data.MinerHash, BlockNum);
    };
    
    Engine.ConvertToTera = function (Block,bBody)
    {
        if(!Block)
            return;
        
        if(!Block.LinkSumHash)
            ToLogTrace("!Block.LinkSumHash on Block=" + Block.BlockNum);
        if(!Block.MinerHash)
            ToLogTrace("!Block.MinerHash on Block=" + Block.BlockNum);
        if(!Block.DataHash)
            ToLogTrace("!Block.DataHash on Block=" + Block.BlockNum);
        
        Block.PrevHash = Block.LinkSumHash;
        Block.AddrHash = Block.MinerHash;
        Block.SeqHash = Block.DataHash;
        
        if(Block.TxData)
            Block.TrDataLen = Block.TxData.length;
        else
            if(Block.TxCount)
                Block.TrDataLen = Block.TxCount;
            else
                Block.TrDataLen = 0;
        
        if(bBody)
        {
            Engine.ConvertBodyToTera(Block);
        }
    };
    
    Engine.ConvertFromTera = function (Block,bBody,bCalc)
    {
        if(!Block)
            return;
        
        if(!Block.PrevHash)
            ToLogTrace("!Block.PrevHash on Block=" + Block.BlockNum);
        if(!Block.AddrHash)
            ToLogTrace("!Block.AddrHash on Block=" + Block.BlockNum);
        if(!Block.SeqHash)
            ToLogTrace("!Block.SeqHash on Block=" + Block.BlockNum);
        
        Block.LinkSumHash = Block.PrevHash;
        Block.MinerHash = Block.AddrHash;
        Block.DataHash = Block.SeqHash;
        
        if(bBody)
        {
            Engine.ConvertBodyFromTera(Block);
        }
        if(bCalc)
        {
            Engine.SetBlockDataFromDB(Block);
        }
    };
    
    Engine.ConvertBodyToTera = function (Block)
    {
        var Arr = [];
        if(Block.TxData)
        {
            for(var i = 0; i < Block.TxData.length; i++)
            {
                Arr.push(Block.TxData[i].body);
            }
        }
        Block.arrContent = Arr;
    };
    
    Engine.ConvertBodyFromTera = function (Block)
    {
        if(Block.arrContent)
        {
            var Arr = [];
            for(var i = 0; i < Block.arrContent.length; i++)
            {
                var Tx = Engine.GetTx(Block.arrContent[i]);
                Arr.push(Tx);
            }
        }
        Block.TxData = Arr;
    };
}
