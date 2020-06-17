/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * Control the number of transactions
 *
**/

'use strict';
global.JINN_MODULES.push({InitClass:InitClass, Name:"TxControl"});

//Engine context

function InitClass(Engine)
{
    Engine.AddTxToTree = function (Tree,Tx)
    {
        if(!Tree.find(Tx))
            Tree.insert(Tx);
    };
    
    Engine.GetTopTxArrayFromTree = function (Tree,BlockNum)
    {
        var Arr = Engine.GetArrayFromTree(Tree);
        if(Engine.PrepareLastStatFromDB())
        {
            Engine.SortArrPriority(Arr, BlockNum);
        }
        
        return Arr;
    };
    Engine.GetArrayFromTree = function (Tree)
    {
        if(!Tree)
            return [];
        var arr = [];
        var it = Tree.iterator(), Item;
        while((Item = it.next()) !== null)
        {
            arr.push(Item);
        }
        return arr;
    };
    Engine.CheckSizeBlockTXArray = function (Arr)
    {
        if(Arr.length > JINN_CONST.MAX_TRANSACTION_COUNT)
            Arr.length = JINN_CONST.MAX_TRANSACTION_COUNT;
        
        var BufLength = 0;
        for(var i = 0; i < Arr.length; i++)
        {
            var Item = Arr[i];
            if(Item.body)
            {
                BufLength += Item.body.length;
                if(BufLength > JINN_CONST.MAX_BLOCK_SIZE)
                {
                    Arr.length = i + 1;
                    break;
                }
            }
        }
    };
    Engine.CheckSizeTransferTXArray = function (Child,Arr)
    {
        
        if(JINN_CONST.MAX_TRANSFER_TX && Arr.length > JINN_CONST.MAX_TRANSFER_TX)
        {
            Child.ToError("#1 Error Tx Arr length = " + Arr.length, 4);
            Arr.length = JINN_CONST.MAX_TRANSFER_TX;
        }
    };
    Engine.IsValidateTx = function (Tx,StrCheckName,BlockNum)
    {
        var Result = CheckTx(StrCheckName, Tx, BlockNum, 1);
        if(!Result)
            JINN_STAT.NoValidateTx++;
        return Result;
    };
}

function FSortTx(a,b)
{
    if(!a.HashPow)
        throw "Error a.HashPow";
    if(!b.HashPow)
        throw "Error b.HashPow";
    return CompareArr(a.HashPow, b.HashPow);
}
global.FSortTx = FSortTx;
