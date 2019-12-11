/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2019 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

function SavePrivateKey()
{
    var Select = document.getElementById("idTypeKey");
    if(Select.value === "brain")
    {
        ConvertToPrivateKey();
        return ;
    }
    var Str = document.getElementById("idKeyNew").value;
    Str = Str.trim();
    if(Select.value === "private" && (Str.length !== 64 || !IsHexStr(Str)))
    {
        SetError("Error: Length must 64 HEX chars. (Length=" + Str.length + ")");
        return ;
    }
    else
        if(Select.value !== "private" && (Str.length !== 66 || Str.substr(0, 1) !== "0" || !IsHexStr(Str)))
        {
            SetError("Error: Length must 66 HEX chars. (Length=" + Str.length + ")");
            return ;
        }
    if(Select.value === "private" && PrivKeyStr !== Str)
        SetStatus("Private key changed");
    else
        if(Select.value === "public" && PubKeyStr !== Str)
            SetStatus("Public key changed");
    GetData("SetWalletKey", Str, function (Data)
    {
        if(Data && Data.result === 1)
        {
            if(Select.value === "private")
                SelectStyle("styleContrast1");
            else
                if(Select.value === "public")
                    SelectStyle("styleContrast2");
            SetVisibleEditKeys(0);
            UpdatesData();
        }
    });
}
function CreateCheckPoint()
{
    if(!ServerBlockNumDB || ServerBlockNumDB < 16)
    {
        SetError("Not set ServerBlockNumDB");
        return ;
    }
    var BlockNum = ServerBlockNumDB - 10;
    SetCheckPoint(BlockNum);
}
function UseAutoCheckPoint()
{
    var Set = $("idUseAutoCheckPoint").checked;
    var Period = ParseNum($("idPeriodAutoCheckPoint").value);
    GetData("SetAutoCheckPoint", {Set:Set, Period:Period}, function (Data)
    {
        if(Data)
        {
            SetStatus(Data.text, !Data.result);
        }
    });
}
function UseAutoCorrTime()
{
    GetData("SetAutoCorrTime", document.getElementById("idUseAutoCorrTime").checked, function (Data)
    {
        if(Data)
        {
            SetStatus(Data.text, !Data.result);
        }
    });
}
function SetCodeVersionJSON()
{
    var Data = JSON.parse(JSON.stringify(CONFIG_DATA.CODE_VERSION));
    if(!Data.BlockNum)
    {
        Data.LevelUpdate = 16;
        Data.BlockPeriod = 3;
    }
    Data.BlockNum = CONFIG_DATA.CurBlockNum;
    Data.addrArr = GetHexFromArr(Data.addrArr);
    Data.Hash = GetHexFromArr(Data.Hash);
    Data.Sign = GetHexFromArr(Data.Sign);
    Data.Hash = undefined;
    Data.Sign = undefined;
    Data.StartLoadVersionNum = undefined;
    var Str = JSON.stringify(Data, "", 2);
    document.getElementById("idDevService").value = Str;
}
function SetCorrTimeJSON()
{
    var AutoDelta = parseInt(document.getElementById("idDevValue").value);
    var Data = {Num:CONFIG_DATA.CurBlockNum, bUse:1, bAddTime:1};
    if(AutoDelta < 0)
    {
        AutoDelta =  - AutoDelta;
        Data.bAddTime = 0;
    }
    Data.DeltaTime = 40;
    Data.StartBlockNum = ServerCurBlockNum + 10;
    Data.EndBlockNum = Data.StartBlockNum + Math.floor(AutoDelta / Data.DeltaTime);
    var Str = JSON.stringify(Data, "", 2);
    document.getElementById("idDevService").value = Str;
}
function SetNetConstJSON()
{
    var Str = JSON.stringify(Data, "", 2);
    document.getElementById("idDevService").value = Str;
    var Data = {MaxTrasactionLimit:CONFIG_DATA.MAX_TRANSACTION_LIMIT, ProtocolVer:CONFIG_DATA.PROTOCOL_VER, ProtocolMode:CONFIG_DATA.PROTOCOL_MODE,
        MaxLevel:CONFIG_DATA.MAX_LEVEL, };
    var Str = JSON.stringify(Data, "", 2);
    document.getElementById("idDevService").value = Str;
}
function SetNewCodeVersion()
{
    try
    {
        var Data = JSON.parse(document.getElementById("idDevService").value);
    }
    catch(e)
    {
        SetError("Error format setting data");
        return ;
    }
    Data.addrArr = GetArrFromHex(Data.addrArr);
    GetData("SetNewCodeVersion", Data, function (Data)
    {
        if(Data)
        {
            SetStatus(Data.text, !Data.result);
        }
    });
}
function StartTimeCorrect()
{
    try
    {
        var Data = JSON.parse(document.getElementById("idDevService").value);
    }
    catch(e)
    {
        SetError("Error format setting data");
        return ;
    }
    GetData("SetCheckDeltaTime", Data, function (Data)
    {
        if(Data)
        {
            SetStatus(Data.text, !Data.result);
        }
    });
}
function StartNetConst()
{
    try
    {
        var Data = JSON.parse(document.getElementById("idDevService").value);
    }
    catch(e)
    {
        SetError("Error format setting data");
        return ;
    }
    GetData("SetCheckNetConstant", Data, function (Data)
    {
        if(Data)
        {
            SetStatus(Data.text, !Data.result);
        }
    });
}
function RestartNode()
{
    GetData("RestartNode", {});
    DoRestartWallet();
}
function UseAutoUpdate()
{
    var Data = {USE_AUTO_UPDATE:document.getElementById("idAutoUpdate").checked, DoMining:1};
    GetData("SaveConstant", Data, function (Data)
    {
        if(Data && Data.result)
        {
            SetStatus("Save AutoUpdate: " + document.getElementById("idAutoUpdate").checked);
        }
    });
}
function UseMining()
{
    if(!MiningAccount)
    {
        SetError("Not set mining account");
        return ;
    }
    var Data = {USE_MINING:document.getElementById("idUseMining").checked, DoMining:1};
    GetData("SaveConstant", Data, function (Data)
    {
        if(Data && Data.result)
        {
            SetStatus("Save Mining: " + document.getElementById("idUseMining").checked);
        }
    });
}
function SetPercentMining()
{
    var Data = {POW_MAX_PERCENT:document.getElementById("idPercentMining").value};
    GetData("SaveConstant", Data, function (Data)
    {
        if(Data && Data.result)
        {
            SetStatus("Save Mining percent: " + document.getElementById("idPercentMining").value + " %");
        }
    });
}
function MiningSets()
{
    var name = "edit_mining_set";
    if(IsVisibleBlock(name))
    {
        SetVisibleBlock(name, false);
    }
    else
    {
        SetVisibleBlock(name, true);
        document.getElementById("idMiningAccount").value = MiningAccount;
        document.getElementById("idMiningAccount").focus();
    }
}
function SaveMiningSet(Value)
{
    SetVisibleBlock("edit_mining_set", false);
    if(Value)
    {
        MiningAccount = Value;
    }
    else
    {
        MiningAccount = ParseNum(document.getElementById("idMiningAccount").value);
    }
    GetData("SetMining", MiningAccount, function (Data)
    {
    });
}
function CancalMiningSet()
{
    var name = "edit_mining_set";
    SetVisibleBlock(name, false);
}
var WasHistoryMaxNum;
var WasLastNumSound = 0;
function CheckNewMoney()
{
    return ;
    if(!$("idUseSoundHistory").checked)
        return ;
    if(WasHistoryMaxNum === HistoryMaxNum || !ServerBlockNumDB)
        return ;
    WasHistoryMaxNum = HistoryMaxNum;
    GetData("GetHistoryAct", {StartNum:HistoryMaxNum - 40, CountNum:40}, function (Data)
    {
        if(Data && Data.result)
        {
            var arr = Data.arr;
            for(var i = 0; i < arr.length; i++)
            {
                var Item = arr[i];
                if(Item.Direct === "+" && Item.BlockNum > ServerBlockNumDB - 60 && Item.BlockNum < ServerBlockNumDB - 20 && Item.BlockNum > WasLastNumSound)
                {
                    WasLastNumSound = Item.BlockNum;
                    $("sound_coin").play();
                }
            }
        }
    });
}
function DoRestartWallet()
{
    SetStatus("<H1 align='center' style='color:blue'>Restarting program...</H1>");
    if(!WasSetRestart)
    {
        WasSetRestart = 1;
        setTimeout(function ()
        {
            window.location.reload();
        }, 10 * 1000);
    }
}
function SetArrLog(arr)
{
    var Str = "";
    var bFindAccount = 0;
    for(var i = 0; i < arr.length; i++)
    {
        var Item = arr[i];
        var tr_text = GetTransactionText(MapSendTransaction[Item.key], Item.key.substr(0, 16));
        var info = Item.time + " " + Item.text;
        if(tr_text)
            info += " (" + tr_text + ")";
        if(Item.final)
        {
            var TR = MapSendTransaction[Item.key];
            if(TR)
            {
                if(Item.text.indexOf("Add to blockchain") >= 0)
                {
                    if(TR.bFindAcc)
                    {
                        bFindAccount = 1;
                        TR.bFindAcc = 0;
                    }
                    if(TR.Run)
                    {
                        TR.Run(TR);
                        TR.Run = undefined;
                    }
                }
            }
            var Account = MapCheckTransaction[Item.key];
            if(Account)
            {
                delete MapCheckTransaction[Item.key];
                Account.NextSendTime = 0;
            }
        }
        Str = Str + info + "\n";
    }
    SetStatusFromServer(Str);
    CheckSending();
    if(bFindAccount)
    {
        FindMyAccounts();
    }
}
function SetAutoMining()
{
    setTimeout(function ()
    {
        var Select = $("idAccount");
        if(Select.options.length)
        {
            SaveMiningSet(Select.options[Select.options.length - 1].value);
        }
    }, 100);
}
function ViewNetworkMode()
{
    if(IsVisibleBlock('idNetworkView'))
    {
        SetVisibleBlock('idNetworkView', false);
    }
    else
    {
        SetVisibleBlock('idNetworkView', true);
        var Mode = CONFIG_DATA.CONSTANTS.NET_WORK_MODE;
        if(!Mode)
        {
            Mode = {};
            Mode.UseDirectIP = true;
            if(INTERNET_IP_FROM_STUN)
                Mode.ip = INTERNET_IP_FROM_STUN;
            else
                Mode.ip = SERVER_IP;
            Mode.port = SERVER_PORT;
        }
        document.getElementById("idUseDirectIP").checked = Mode.UseDirectIP;
        document.getElementById("idIP").value = Mode.ip;
        document.getElementById("idPort").value = Mode.port;
    }
}
function SetNetworkParams(bRestart)
{
    var Mode = {};
    Mode.UseDirectIP = document.getElementById("idUseDirectIP").checked;
    Mode.ip = document.getElementById("idIP").value;
    Mode.port = ParseNum(document.getElementById("idPort").value);
    Mode.DoRestartNode = bRestart;
    GetData("SetNetMode", Mode, function (Data)
    {
        if(Data && Data.result)
        {
            SetStatus("Set net work params OK");
            SetVisibleBlock('idNetworkView', false);
        }
    });
    if(bRestart)
        DoRestartWallet();
}
function ViewConstant()
{
    if(IsVisibleBlock('idConstantView'))
    {
        SetVisibleBlock('idConstantView', false);
    }
    else
    {
        SetVisibleBlock('idConstantView', true);
        document.getElementById("idConstant").value = JSON.stringify(CONFIG_DATA.CONSTANTS, "", 2);
    }
}
function SaveConstant(bRestart)
{
    try
    {
        var Data = JSON.parse(document.getElementById("idConstant").value);
    }
    catch(e)
    {
        SetError("Error JSON format setting constant");
        return ;
    }
    Data.DoRestartNode = bRestart;
    GetData("SaveConstant", Data, function (Data)
    {
        if(Data && Data.result)
        {
            SetStatus("Save Constant OK");
            SetVisibleBlock('idConstantView', false);
        }
    });
    if(bRestart)
        DoRestartWallet();
}
function ViewRemoteParams()
{
    if(IsVisibleBlock('idRemoteView'))
    {
        SetVisibleBlock('idRemoteView', false);
    }
    else
    {
        SetVisibleBlock('idRemoteView', true);
        if(CONFIG_DATA.HTTPPort)
            document.getElementById("idHTTPPort").value = CONFIG_DATA.HTTPPort;
        document.getElementById("idHTTPPassword").value = CONFIG_DATA.HTTPPassword;
    }
}
function SetRemoteParams(bRestart)
{
    var PrevHTTPPassword = HTTPPassword;
    var HTTPPort = ParseNum(document.getElementById("idHTTPPort").value);
    var HTTPPassword = document.getElementById("idHTTPPassword").value;
    GetData("SetHTTPParams", {HTTPPort:HTTPPort, HTTPPassword:HTTPPassword, DoRestartNode:bRestart}, function (Data)
    {
        if(!PrevHTTPPassword && HTTPPassword)
            window.location.reload();
        else
        {
            SetVisibleBlock('idRemoteView', false);
            SetStatus("Set HTTP params OK");
        }
    });
    if(bRestart)
        DoRestartWallet();
}
function RewriteAllTransactions()
{
    DoBlockChainProcess("RewriteAllTransactions", "Rewrite all transactions", 0);
}
function RewriteTransactions()
{
    DoBlockChainProcess("RewriteTransactions", "Rewrite transactions on last %1 blocks", 1);
}
function TruncateBlockChain()
{
    DoBlockChainProcess("TruncateBlockChain", "Truncate last %1 blocks", 1);
}
function ClearDataBase()
{
    DoBlockChainProcess("ClearDataBase", "Clear DataBase", 0);
}
function CleanChain()
{
    DoBlockChainProcess("CleanChain", "Clean chain on last %1 blocks", 1);
}
function DoBlockChainProcess(FuncName,Text,LastBlock)
{
    SaveValues();
    var Params = {};
    if(LastBlock)
    {
        Params.BlockCount = ParseNum(document.getElementById("idBlockCount").value);
        Text = Text.replace("%1", Params.BlockCount);
    }
    var result = confirm(Text + "?");
    if(!result)
        return ;
    SetVisibleBlock("idServerBlock", 1);
    SetStatus("START: " + Text);
    GetData(FuncName, Params, function (Data)
    {
        if(Data)
        {
            SetStatus("FINISH: " + Text, !Data.result);
        }
    });
}
