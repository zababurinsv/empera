/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * The priority of the transaction when transferring between nodes
 *
 * This is the plan (approximate figures)
 * Every 10K Tera that is on the account gives the right to make one transaction every 100 blocks (5 minutes). Moreover, the higher the load, the more coins the higher the priority.
 * If the account has less than 10K Tera, then you can make one transaction only if the blockchain is low (less than 10 transactions per block).

**/

'use strict';
global.JINN_MODULES.push({InitClass:InitClass, Name:"TxPriority"});


//Engine context
function InitClass(Engine)
{
    Engine.InitPriorityTree = function ()
    {
        Engine.SenderActTree = new RBTree(function (a,b)
        {
            return a.BlockNum - b.BlockNum;
        });
        Engine.SenderRestTree = new RBTree(function (a,b)
        {
            return a.SenderNum - b.SenderNum;
        });
    };
    Engine.PrepareLastStatFromDB = function (HeadBlockNum)
    {
        if(!JINN_CONST.TX_PRIORITY_MODE)
            return 0;
        
        if(!HeadBlockNum)
            HeadBlockNum = Engine.CurrentBlockNum - JINN_CONST.STEP_SAVE;
        if(HeadBlockNum < JINN_CONST.BLOCK_GENESIS_COUNT)
            return 0;
        
        var Num = HeadBlockNum;
        var Count = 0;
        while(Count < JINN_CONST.TX_PRIORITY_LENGTH)
        {
            var BlockDB = Engine.GetBlockDB(Num);
            if(!BlockDB)
                return 0;
            
            var Find = Engine.SenderActTree.find(BlockDB);
            if(Find)
            {
                if(IsEqArr(Find.Hash, BlockDB.Hash))
                    break;
                
                if(IsEqArr(Find.TreeHash, BlockDB.TreeHash))
                {
                    
                    Find.Hash = BlockDB.Hash;
                    Num--;
                    continue;
                }
                
                Engine.SenderActTree.remove(Find);
            }
            
            var Arr = Engine.GetSenderArrFromBlock(BlockDB);
            var NewData = {BlockNum:BlockDB.BlockNum, Hash:BlockDB.Hash, TreeHash:BlockDB.TreeHash, Arr:Arr};
            
            Engine.OperationToPriorityTree(NewData.Arr, 1);
            Engine.SenderActTree.insert(NewData);
            
            if(Find)
            {
                Engine.OperationToPriorityTree(Find.Arr,  - 1);
            }
            
            Num--;
            Count++;
        }
        var MinNum = HeadBlockNum - JINN_CONST.TX_PRIORITY_LENGTH;
        var Data;
        while(1)
        {
            Data = Engine.SenderActTree.min();
            if(Data && Data.BlockNum <= MinNum)
            {
                Engine.OperationToPriorityTree(Data.Arr,  - 1);
                Engine.SenderActTree.remove(Data);
                continue;
            }
            
            Data = Engine.SenderActTree.max();
            if(Data && Data.BlockNum > HeadBlockNum)
            {
                Engine.OperationToPriorityTree(Data.Arr,  - 1);
                Engine.SenderActTree.remove(Data);
                continue;
            }
            
            break;
        }
        
        return 1;
    };
    Engine.GetSenderArrFromBlock = function (Block)
    {
        Engine.CheckLoadBody(Block);
        
        var Arr = [];
        for(var i = 0; Block.TxData && i < Block.TxData.length; i++)
        {
            var Tx = Block.TxData[i];
            var SenderNum = Engine.GetTxSenderNum(Tx, Block.BlockNum);
            if(SenderNum >= 0)
                Arr.push(SenderNum);
        }
        
        return Arr;
    };
    
    Engine.OperationToPriorityTree = function (Arr,Count)
    {
        for(var i = 0; i < Arr.length; i++)
        {
            var SenderNum = Arr[i];
            var Find = Engine.SenderRestTree.find({SenderNum:SenderNum});
            if(!Find && Count > 0)
            {
                Find = {SenderNum:SenderNum, Count:0};
                Engine.SenderRestTree.insert(Find);
            }
            
            if(Find)
            {
                Find.Count += Count;
                if(Find.Count < 0)
                    Engine.ToLog("Error Count=" + Find.Count + " on SenderNum = " + SenderNum, 2);
                if(Find.Count === 0)
                {
                    Engine.SenderRestTree.remove(Find);
                }
            }
            else
            {
                Engine.ToLog("Error find SenderNum = " + SenderNum + " size=" + Engine.SenderRestTree.size, 2);
            }
        }
    };
    Engine.GetTxSenderCount = function (SenderNum)
    {
        var Find = Engine.SenderRestTree.find({SenderNum:SenderNum});
        if(Find)
        {
            return Find.Count;
        }
        
        return 0;
    };
    
    Engine.GetTxSenderNum = function (Tx,BlockNum)
    {
        var RndNum = Tx.HashTicket[0] >>> 4;
        return RndNum;
    };
    Engine.GetTxSenderOperationID = function (Tx,BlockNum)
    {
        return 0;
    };
    
    Engine.GetSenderBaseValue = function (Num)
    {
        return 0;
    };
    
    Engine.AddBlockToSenderTree = function (Block)
    {
        var Find = Engine.SenderActTree.find({BlockNum:Block.BlockNum});
        
        var Arr = Engine.GetSenderArrFromBlock(Block);
        var NewData = {BlockNum:Block.BlockNum, Hash:Block.Hash, TreeHash:Block.TreeHash, Arr:Arr};
        Engine.OperationToPriorityTree(NewData.Arr, 1);
        
        if(Find)
        {
            if(Find.Arr.length)
            {
                ToLog("Was find " + Find.BlockNum + " Find.Arr=" + Find.Arr.length);
                Engine.OperationToPriorityTree(Find.Arr,  - 1);
            }
            Engine.SenderActTree.remove(Find);
        }
        
        Engine.SenderActTree.insert(NewData);
    };
    Engine.SortBlockPriority = function (Block)
    {
        var NumNew = Engine.CurrentBlockNum - JINN_CONST.STEP_NEW_BLOCK;
        if(!JINN_CONST.TX_PRIORITY_MODE || !Block || !Block.TxData || Block.TxData.length <= 1 || Block.BlockNum !== NumNew)
            return Engine.SortBlock(Block);
        
        var NumSave = Engine.CurrentBlockNum - JINN_CONST.STEP_SAVE;
        var bPriority = Engine.PrepareLastStatFromDB(NumSave);
        if(!bPriority)
        {
            ToLog("OLD SORT MODE = " + Block.BlockNum, 3);
            return Engine.SortBlock(Block);
        }
        
        var Arr = Block.TxData;
        return Engine.SortArrPriority(Arr, Block.BlockNum);
    };
    
    Engine.SortArrPriority = function (Arr,BlockNum)
    {
        Engine.CheckHashExistArr(Arr, BlockNum);
        Arr.sort(function (a,b)
        {
            if(typeof a.SenderNum !== "number")
                ToLogTrace("Error type a.SenderNum");
            if(typeof b.SenderNum !== "number")
                ToLogTrace("Error type b.SenderNum");
            
            if(typeof a.OperationID !== "number")
                ToLogTrace("Error type a.OperationID");
            if(typeof b.OperationID !== "number")
                ToLogTrace("Error type b.OperationID");
            
            if(!a.HASH)
                ToLogTrace("Error a.HASH");
            if(!b.HASH)
                ToLogTrace("Error b.HASH");
            
            if(a.SenderNum !== b.SenderNum)
                return a.SenderNum - b.SenderNum;
            
            if(a.OperationID !== b.OperationID)
                return a.OperationID - b.OperationID;
            return CompareArr(a.HASH, b.HASH);
        });
        var SumAdd = 0;
        var PrevSenderNum = undefined;
        for(var i = 0; i < Arr.length; i++)
        {
            var Tx = Arr[i];
            if(PrevSenderNum === Tx.SenderNum)
            {
                SumAdd++;
                Tx.CountTX += SumAdd;
            }
            else
            {
                SumAdd = 0;
            }
            
            PrevSenderNum = Tx.SenderNum;
        }
        for(var i = 0; i < Arr.length; i++)
        {
            var Tx = Arr[i];
            if(typeof Tx.CountTX !== "number")
                ToLogTrace("Error type Tx.CountTX");
            
            Tx.Priority = Tx.CountTX;
            if(JINN_CONST.TX_BASE_VALUE)
            {
                Tx.CanBaseTx = Tx.BaseValue / JINN_CONST.TX_BASE_VALUE;
                Tx.Priority -= Tx.CanBaseTx;
            }
        }
        Arr.sort(function (a,b)
        {
            if(typeof a.OperationID !== "number")
                ToLogTrace("Error type a.OperationID");
            if(typeof b.OperationID !== "number")
                ToLogTrace("Error type b.OperationID");
            if(typeof a.Priority !== "number")
                ToLogTrace("Error type a.Priority");
            if(typeof b.Priority !== "number")
                ToLogTrace("Error type b.Priority");
            
            if(!a.HASH)
                ToLogTrace("Error a.HASH");
            if(!b.HASH)
                ToLogTrace("Error b.HASH");
            
            if(a.Priority !== b.Priority)
                return a.Priority - b.Priority;
            
            if(a.OperationID !== b.OperationID)
                return a.OperationID - b.OperationID;
            return CompareArr(a.HASH, b.HASH);
        });
        for(var i = JINN_CONST.TX_FREE_COUNT; i < Arr.length; i++)
        {
            var Tx = Arr[i];
            var Delta = Tx.CanBaseTx - Tx.CountTX - 1;
            if(Delta < 0)
            {
                Arr.length = i;
                break;
            }
        }
        
        return 1;
    };
    
    Engine.InitPriorityTree();
}
