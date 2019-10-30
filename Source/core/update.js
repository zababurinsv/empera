/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2019 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

global.RunOnUpdate = RunOnUpdate;
function RunOnUpdate()
{
    var fname = GetDataPath("DB/update.lst");
    var UpdateInfo = LoadParams(fname, {UPDATE_NUM_COMPLETE:1071});
    if(!UpdateInfo.UPDATE_NUM_COMPLETE)
        UpdateInfo.UPDATE_NUM_COMPLETE = 0;
    var CurNum = UpdateInfo.UPDATE_NUM_COMPLETE;
    if(CurNum !== UPDATE_CODE_VERSION_NUM)
    {
        UpdateInfo.UPDATE_NUM_COMPLETE = UPDATE_CODE_VERSION_NUM;
        ToLog("UPDATER Start");
        SaveParams(fname, UpdateInfo);
        if(global.TEST_NETWORK)
        {
            if(CurNum < 1137)
            {
                SERVER.ClearDataBase();
            }
            if(CurNum < 1184)
            {
                setTimeout(function ()
                {
                    ToLog("UPD: START RewriteAllTransactions");
                    SERVER.RewriteAllTransactions();
                }, 3000);
            }
        }
        else
        {
        }
        ToLog("UPDATER Finish");
    }
}
function CreateHeadersHash100()
{
    ToLog("CreateHeadersHash100");
    const DBRow = require("./db/db-row");
    global.UpdateMode = 1;
    var DB = SERVER.DBHeader100;
    var Num = 0;
    var PrevHash100 = [];
    while(1)
    {
        var Block = SERVER.ReadBlockHeaderDB(Num);
        if(!Block)
            break;
        var Hash100;
        if(Num === 0)
            Hash100 = [];
        else
            Hash100 = sha3arr2(PrevHash100, Block.Hash);
        DB.Write({Num:Num / 100, Hash100:Hash100, Hash:Block.Hash});
        if(Num % 1000000 === 0)
            ToLog("Create Hash100:" + Num);
        PrevHash100 = Hash100;
        Num += 100;
    }
    global.UpdateMode = 0;
}
function CheckRewriteTr(Num,StrHash,StartRewrite)
{
    if(SERVER.BlockNumDB < StartRewrite)
        return "NO";
    var AccountsHash = DApps.Accounts.GetHashOrUndefined(Num);
    if(!AccountsHash || GetHexFromArr(AccountsHash) !== StrHash)
    {
        ToLog("START REWRITE ERR ACTS TRANSACTIONS");
        SERVER.ReWriteDAppTransactions(SERVER.BlockNumDB - StartRewrite);
        return "Rewrite";
    }
    else
    {
        return "OK";
    }
}
function CheckRewriteAllTr2(Num,StrHash,Num2,StrHash2)
{
    if(global.LOCAL_RUN || global.TEST_NETWORK)
        return "NONE";
    var MaxNum = SERVER.GetMaxNumBlockDB();
    if(MaxNum < START_BLOCK_ACCOUNT_HASH)
        return "NONE";
    var AccountsHash = DApps.Accounts.GetHashOrUndefined(Num);
    var AccountsHash2 = DApps.Accounts.GetHashOrUndefined(Num2);
    if(AccountsHash2 && GetHexFromArr(AccountsHash2) === StrHash2)
        return "OK";
    if(AccountsHash && GetHexFromArr(AccountsHash) !== StrHash)
    {
        ToLog("***************** START REWRITE ALL DAPPS");
        global.UpdateMode = 1;
        for(var key in DApps)
        {
            DApps[key].ClearDataBase();
        }
        global.UpdateMode = 0;
        return "Rewrite";
    }
    else
    {
        return "OK";
    }
}
function CheckRewriteAllTr(Num,StrHash,Num2,StrHash2)
{
    if(global.LOCAL_RUN || global.TEST_NETWORK)
        return "NONE";
    var MaxNum = SERVER.GetMaxNumBlockDB();
    if(MaxNum < START_BLOCK_ACCOUNT_HASH)
        return "NONE";
    var AccountsHash = DApps.Accounts.GetHashOrUndefined(Num);
    if(AccountsHash && GetHexFromArr(AccountsHash) !== StrHash)
    {
        ToLog("***************** START REWRITE ALL DAPPS");
        global.UpdateMode = 1;
        for(var key in DApps)
        {
            DApps[key].ClearDataBase();
        }
        global.UpdateMode = 0;
        return "Rewrite";
    }
    else
    {
        return "OK";
    }
}
global.CheckRewriteTr = CheckRewriteTr;
function RecreateAccountRest1()
{
    var name = "accounts-rest";
    var fname = GetDataPath("DB/" + name);
    if(fs.existsSync(fname))
    {
        ToLog("Delete " + fname);
        fs.unlinkSync(fname);
    }
}
function RecreateAccountHashDB3()
{
    var name = "accounts-hash2";
    var fname = GetDataPath("DB/" + name);
    if(fs.existsSync(fname))
    {
        global.UpdateMode = 1;
        ToLog("Start updating " + name);
        const DBRow = require("../core/db/db-row");
        var DB0 = new DBRow(name, 6 + 32 + 32 + 10, "{BlockNum:uint, Hash:hash, SumHash:hash, Reserve: arr10}");
        var DB3 = DApps.Accounts.DBAccountsHash;
        for(var num = 0; true; num++)
        {
            var Item = DB0.Read(num);
            if(!Item)
                break;
            Item.AccHash = Item.Hash;
            DB3.Write(Item);
        }
        ToLog("Finish updating " + name);
        DB0.Close();
        DB3.Close();
        global.UpdateMode = 0;
        fs.unlinkSync(fname);
    }
}
function ReWriteDBSmartWrite()
{
    global.UpdateMode = 1;
    ToLog("Start ReWriteDBSmartWrite");
    require("../core/db/db-row");
    for(var num = 0; true; num++)
    {
        var Item = DApps.Smart.DBSmart.Read(num);
        if(!Item)
            break;
        var Body = BufLib.GetBufferFromObject(Item, DApps.Smart.FORMAT_ROW, 20000, {});
        if(Body.length > 15000)
            ToLog("Smart " + Item.Num + ". " + Item.Name + " length=" + Body.length);
        DApps.Smart.DBSmartWrite(Item);
    }
    ToLog("Finish ReWriteDBSmartWrite");
    DApps.Smart.DBSmart.Close();
    global.UpdateMode = 0;
}
