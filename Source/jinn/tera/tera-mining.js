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
    Engine.GetNewBlock = function (BlockNum,TxArr,bInMemory)
    {
        Engine.SortBlock({TxData:TxArr});
        var Tx = SERVER.GetDAppTransactions(BlockNum);
        if(Tx)
        {
            Tx = Engine.GetTx(Tx.body);
            TxArr.unshift(Tx);
        }
        
        var Block = {};
        Block.BlockNum = BlockNum;
        Block.TxData = TxArr;
        Block.TreeHash = Engine.CalcTreeHash(Block.BlockNum, Block.TxData);
        Block.MinerHash = ZERO_ARR_32;
        
        Block.TrCount = Block.TxData.length;
        Block.TxCount = Block.TrCount;
        
        if(bInMemory)
        {
            Block.PrevSumHash = ZERO_ARR_32;
            Block.LinkSumHash = ZERO_ARR_32;
        }
        else
        {
            Engine.SetBlockDataFromDB(Block);
        }
        
        Engine.CalcBlockData(Block);
        
        Engine.ConvertToTera(Block);
        CreateHashMinimal(Block, GENERATE_BLOCK_ACCOUNT);
        Engine.ConvertFromTera(Block, 0, !bInMemory);
        Engine.CalcBlockData(Block);
        if(!bInMemory && global.USE_MINING && !Block.StartMining && Block.BlockNum > 0)
        {
            Block.StartMining = true;
            Engine.ConvertToTera(Block);
            global.SetCalcPOW(Block, "FastCalcBlock");
        }
        
        if(!global.USE_MINING)
            Engine.AddBlockToChain(Block);
        
        return Block;
    };
    
    SERVER.MiningProcess = function (msg)
    {
        var BlockDB = Engine.GetBlockHeaderDB(msg.BlockNum);
        if(!BlockDB)
            return ;
        
        var Block = CopyObjKeys({}, BlockDB);
        var SeqHash = Block.DataHash;
        var AddrHash = Block.MinerHash.slice(0);
        
        if(Block.Hash && SeqHash && CompareArr(SeqHash, msg.SeqHash) === 0 && CompareArr(SeqHash, msg.SeqHash) === 0)
        {
            
            var ValueOld = GetHashFromSeqAddr(SeqHash, AddrHash, Block.BlockNum);
            var ValueMsg = GetHashFromSeqAddr(msg.SeqHash, msg.AddrHash, Block.BlockNum);
            
            var bWas = 0;
            if(CompareArr(ValueOld.Hash1, ValueMsg.Hash1) > 0)
            {
                
                var Nonce1 = ReadUintFromArr(msg.AddrHash, 12);
                var DeltaNum1 = ReadUint16FromArr(msg.AddrHash, 24);
                WriteUintToArrOnPos(AddrHash, Nonce1, 12);
                WriteUint16ToArrOnPos(AddrHash, DeltaNum1, 24);
                
                bWas += 1;
            }
            if(CompareArr(ValueOld.Hash2, ValueMsg.Hash2) > 0)
            {
                
                var Nonce0 = ReadUintFromArr(msg.AddrHash, 6);
                var Nonce2 = ReadUintFromArr(msg.AddrHash, 18);
                var DeltaNum2 = ReadUint16FromArr(msg.AddrHash, 26);
                WriteUintToArrOnPos(AddrHash, Nonce0, 6);
                WriteUintToArrOnPos(AddrHash, Nonce2, 18);
                WriteUint16ToArrOnPos(AddrHash, DeltaNum2, 26);
                
                bWas += 2;
            }
            if(!bWas)
                return ;
            
            Block.MinerHash = AddrHash;
            Engine.CalcBlockData(Block);
            if(Block.Power < 10)
                return ;
            Engine.AddBlockToChain(Block);
            
            ADD_TO_STAT("MAX:POWER", Block.Power);
            var HashCount = Math.pow(2, Block.Power);
            ADD_HASH_RATE(HashCount);
        }
    };
}
