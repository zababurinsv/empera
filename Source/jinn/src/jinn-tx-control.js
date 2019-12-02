/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2019 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

global.JINN_MODULES.push({Init:Init});
function Init(Engine)
{
    Engine.IsValidateTx = function (Tx,StrCheckName,BlockNum)
    {
        return CheckTx(StrCheckName, Tx, BlockNum, 1);
    };
    Engine.FSortTx = function (a,b)
    {
        if(a.TimePow !== b.TimePow)
            return b.TimePow - a.TimePow;
        if(a.KEY === b.KEY)
            return 0;
        if(a.KEY < b.KEY)
            return  - 1;
        else
            return 1;
    };
    Engine.SetTopTxArray = function (MapTx)
    {
        if(!MapTx)
            return ;
        var TxArr = GetArrFromMap(MapTx);
        if(TxArr.length > JINN_CONST.MAX_TRANSACTION_COUNT)
            TxArr.sort(Engine.FSortTx);
        for(var i = 0; i < TxArr.length; i++)
        {
            if(i < JINN_CONST.MAX_TRANSACTION_COUNT)
                TxArr[i].Top = 1;
            else
                TxArr[i].Top = 0;
        }
    };
    Engine.GetTopTxArray = function (MapTx,bSortAlways)
    {
        if(!MapTx)
            return [];
        var TxArr = GetArrFromMap(MapTx);
        if(TxArr.length > JINN_CONST.MAX_TRANSACTION_COUNT)
        {
            TxArr.sort(Engine.FSortTx);
            TxArr.length = JINN_CONST.MAX_TRANSACTION_COUNT;
        }
        else
            if(bSortAlways)
            {
                TxArr.sort(Engine.FSortTx);
            }
        return TxArr;
    };
    Engine.CheckSizeTXArray = function (TxArr)
    {
        if(TxArr.length > JINN_CONST.MAX_TRANSACTION_COUNT)
        {
            Engine.ToLog("Error Tx Arr length = " + TxArr.length);
            TxArr.length = JINN_CONST.MAX_TRANSACTION_COUNT;
        }
    };
}
