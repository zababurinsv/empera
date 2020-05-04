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
    Engine.GetNewBlock = function (PrevBlock,bAddCurrentTx)
    {
        if(!PrevBlock)
            return undefined;
        var Block = {};
        Block.BlockNum = PrevBlock.BlockNum + 1;
        
        if(bAddCurrentTx)
        {
            Block.TxData = Engine.GetTopTxArrayFromTree(Engine.ListTreeTx[Block.BlockNum]);
            Engine.SortBlock(Block);
            
            var Tx = SERVER.GetDAppTransactions(Block.BlockNum);
            if(Tx)
            {
                Tx = Engine.GetTx(Tx.body);
                Block.TxData.unshift(Tx);
            }
            Block.TreeHash = Engine.CalcTreeHash(Block.BlockNum, Block.TxData);
            Block.TxCount = Block.TxData.length;
            Block.TrCount = Block.TxCount;
        }
        else
        {
            Engine.FillBodyCurrentTx(Block);
            Block.TrCount = Block.TxCount;
        }
        
        Block.PrevSumHash = PrevBlock.SumHash;
        Block.PrevSumPow = PrevBlock.SumPow;
        var PrevHashNum = ReadUint32FromArr(PrevBlock.SumHash, 28);
        Block.MinerHash = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        WriteUintToArrOnPos(Block.MinerHash, GENERATE_BLOCK_ACCOUNT, 0);
        WriteUint32ToArrOnPos(Block.MinerHash, PrevHashNum, 28);
        
        Engine.CalcBlockData(Block);
        
        return Block;
    };
    
    Engine.AddToMining = function (Block)
    {
        
        var CurBlockNum = JINN_EXTERN.GetCurrentBlockNumByTime();
        if(global.USE_MINING)
        {
            var Delta = CurBlockNum - Block.BlockNum;
            ToLog("Run mining BlockNum=" + Block.BlockNum + ", Delta=" + Delta, 5);
            
            Engine.ConvertToTera(Block);
            
            global.SetCalcPOW(Block, "FastCalcBlock");
        }
    };
    
    SERVER.MiningProcess = function (msg)
    {
        
        var PrevHash = msg.PrevHash;
        var DataHash = msg.SeqHash;
        var MinerHash = msg.AddrHash;
        
        var bWas = 0;
        var bFind = 0;
        var Arr = Engine.MiningBlockArr[msg.BlockNum];
        if(!Arr)
        {
            Arr = [];
            Engine.MiningBlockArr[msg.BlockNum] = Arr;
        }
        
        for(var i = 0; i < Arr.length; i++)
        {
            var MiningBlock = Arr[i];
            if(IsEqArr(DataHash, MiningBlock.DataHash) && IsEqArr(PrevHash, MiningBlock.PrevHash))
            {
                bFind = 1;
                var MinerHashArr = MiningBlock.MinerHash.slice(0);
                if(DoBestMiningArr(MiningBlock, MinerHash, MinerHashArr))
                {
                    MiningBlock.MinerHash = MinerHashArr;
                    Engine.CalcBlockData(MiningBlock);
                    bWas = 2;
                }
            }
        }
        
        if(!bFind)
        {
            var PrevBlock = Engine.DB.FindBlockByHash(msg.BlockNum - 1, PrevHash);
            if(PrevBlock)
            {
                var MiningBlock = Engine.GetNewBlock(PrevBlock);
                MiningBlock.PrevHash = PrevHash;
                MiningBlock.DataHash = DataHash;
                MiningBlock.MinerHash = MinerHash;
                Engine.CalcBlockData(MiningBlock);
                bWas = 1;
                
                Arr.push(MiningBlock);
            }
        }
        
        if(bWas)
        {
            Engine.ToLog("Block = " + MiningBlock.BlockNum + " Total=" + (msg.TotalCount / 1000000) + "M Power=" + MiningBlock.Power + "  Mode=" + bWas + " Arr=" + Arr.length,
            4);
            
            ADD_TO_STAT("MAX:POWER", MiningBlock.Power);
            var HashCount = Math.pow(2, MiningBlock.Power);
            ADD_HASH_RATE(HashCount);
        }
    };
    
    function DoBestMiningArr(Block,MinerHashMsg,MinerHashArr)
    {
        
        var ValueOld = GetHashFromSeqAddr(Block.DataHash, Block.MinerHash, Block.BlockNum, Block.PrevHash);
        var ValueMsg = GetHashFromSeqAddr(Block.DataHash, MinerHashMsg, Block.BlockNum, Block.PrevHash);
        
        var bWas = 0;
        if(CompareArr(ValueOld.Hash1, ValueMsg.Hash1) > 0)
        {
            
            var Nonce1 = ReadUintFromArr(MinerHashMsg, 12);
            var DeltaNum1 = ReadUint16FromArr(MinerHashMsg, 24);
            WriteUintToArrOnPos(MinerHashArr, Nonce1, 12);
            WriteUint16ToArrOnPos(MinerHashArr, DeltaNum1, 24);
            
            bWas += 1;
        }
        if(CompareArr(ValueOld.Hash2, ValueMsg.Hash2) > 0)
        {
            
            var Nonce0 = ReadUintFromArr(MinerHashMsg, 6);
            var Nonce2 = ReadUintFromArr(MinerHashMsg, 18);
            var DeltaNum2 = ReadUint16FromArr(MinerHashMsg, 26);
            WriteUintToArrOnPos(MinerHashArr, Nonce0, 6);
            WriteUintToArrOnPos(MinerHashArr, Nonce2, 18);
            WriteUint16ToArrOnPos(MinerHashArr, DeltaNum2, 26);
            
            bWas += 2;
        }
        
        return bWas;
    };
    
    function AddBestMiningHash_OLD(Block,MinerHashMsg,msg)
    {
        
        var MinerHashArr;
        
        var MinerOld = ReadUintFromArr(Block.MinerHash, 0);
        
        var ValueOld = GetHashFromSeqAddr(Block.DataHash, Block.MinerHash, Block.BlockNum);
        var ValueMsg = GetHashFromSeqAddr(Block.DataHash, MinerHashMsg, Block.BlockNum);
        
        var bWas = 0;
        if(MinerOld === GENERATE_BLOCK_ACCOUNT)
        {
            MinerHashArr = Block.MinerHash.slice(0);
            if(CompareArr(ValueOld.Hash1, ValueMsg.Hash1) > 0)
            {
                
                var Nonce1 = ReadUintFromArr(MinerHashMsg, 12);
                var DeltaNum1 = ReadUint16FromArr(MinerHashMsg, 24);
                WriteUintToArrOnPos(MinerHashArr, Nonce1, 12);
                WriteUint16ToArrOnPos(MinerHashArr, DeltaNum1, 24);
                
                bWas += 1;
            }
            if(CompareArr(ValueOld.Hash2, ValueMsg.Hash2) > 0)
            {
                
                var Nonce0 = ReadUintFromArr(MinerHashMsg, 6);
                var Nonce2 = ReadUintFromArr(MinerHashMsg, 18);
                var DeltaNum2 = ReadUint16FromArr(MinerHashMsg, 26);
                WriteUintToArrOnPos(MinerHashArr, Nonce0, 6);
                WriteUintToArrOnPos(MinerHashArr, Nonce2, 18);
                WriteUint16ToArrOnPos(MinerHashArr, DeltaNum2, 26);
                
                bWas += 2;
            }
        }
        else
        {
            MinerHashArr = MinerHashMsg;
            bWas = 4;
        }
        
        if(!bWas)
            return;
        
        var BlockNew = Engine.GetCopyBlock(Block);
        
        BlockNew.MinerHash = MinerHashArr;
        Engine.CalcBlockData(BlockNew);
        
        if(Engine.AddBlockToChain(BlockNew, 1))
        {
            
            Engine.ToLog("Miner=" + MinerOld + " Block = " + BlockNew.BlockNum + " Total=" + (msg.TotalCount / 1000000) + " M Power=" + BlockNew.Power,
            4);
            
            ADD_TO_STAT("MAX:POWER", BlockNew.Power);
            var HashCount = Math.pow(2, BlockNew.Power);
            ADD_HASH_RATE(HashCount);
        }
    };
}
