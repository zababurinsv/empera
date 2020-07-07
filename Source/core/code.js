/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

"use strict";

var fs = require("fs");



require("./update-code");

module.exports = class CCode extends require("./base")
{
    constructor(SetKeyPair, RunIP, RunPort, UseRNDHeader, bVirtual)
    {
        super(SetKeyPair, RunIP, RunPort, UseRNDHeader, bVirtual)
        
        if(!global.ADDRLIST_MODE && !this.VirtualMode || global.JINN_MODE)
        {
            setInterval(this.CheckLoadCodeTime.bind(this), 10 * 1000)
        }
        
        this.LastEvalCodeNum = 0
        
        CheckCreateDir(GetDataPath("Update"))
    }
    CheckLoadCodeTime()
    {
        if(START_LOAD_CODE.StartLoadNode && START_LOAD_CODE.StartLoadVersionNum)
        {
            var Delta = new Date() - START_LOAD_CODE.StartLoadVersionNumTime;
            if(Delta > 20 * 1000)
            {
                ToError("Cannot load code version:" + START_LOAD_CODE.StartLoadVersionNum + " from node: " + START_LOAD_CODE.StartLoadNode.ip + ":" + START_LOAD_CODE.StartLoadNode.port)
                this.ClearLoadCode()
            }
        }
    }
    ClearLoadCode()
    {
        START_LOAD_CODE.StartLoad = undefined
        START_LOAD_CODE.StartLoadVersionNum = 0
        START_LOAD_CODE.StartLoadVersionNumTime = 0
    }
    
    StartLoadCode(Node, CodeVersion)
    {
        
        var VersionNum = CodeVersion.VersionNum;
        
        START_LOAD_CODE.StartLoad = CodeVersion
        START_LOAD_CODE.StartLoadNode = Node
        START_LOAD_CODE.StartLoadVersionNum = VersionNum
        START_LOAD_CODE.StartLoadVersionNumTime = new Date()
        
        var fname = GetDataPath("Update/wallet-" + VersionNum + ".zip");
        if(fs.existsSync(fname))
        {
            this.UseCode(VersionNum, false)
        }
        else
        {
            this.StartGetNewCode(Node, VersionNum)
        }
    }
    
    DownloadingNewCodeToPath(Node, Data, VersionNum)
    {
        var fname = GetDataPath("Update/wallet-" + VersionNum + ".zip");
        if(!fs.existsSync(fname))
        {
            var Hash = shaarr(Data);
            if(CompareArr(Hash, START_LOAD_CODE.StartLoad.Hash) === 0)
            {
                var file_handle = fs.openSync(fname, "w");
                fs.writeSync(file_handle, Data, 0, Data.length)
                fs.closeSync(file_handle)
                fname = GetDataPath("Update/wallet.zip")
                file_handle = fs.openSync(fname, "w")
                fs.writeSync(file_handle, Data, 0, Data.length)
                fs.closeSync(file_handle)
                
                this.UseCode(VersionNum, global.USE_AUTO_UPDATE)
                
                return 1;
            }
            else
            {
                ToError("Error check hash of version code :" + START_LOAD_CODE.StartLoadVersionNum + " from node: " + Node.ip + ":" + Node.port)
                this.ClearLoadCode()
                return 0;
            }
        }
        return 1;
    }
    
    UseCode(VersionNum, bUpdate)
    {
        if(bUpdate)
        {
            UpdateCodeFiles(VersionNum)
        }
        
        if(global.START_LOAD_CODE.StartLoad)
        {
            global.CODE_VERSION = START_LOAD_CODE.StartLoad
            this.ClearLoadCode()
        }
    }
    
    SetNewCodeVersion(Data, PrivateKey)
    {
        
        var fname = GetDataPath("ToUpdate/wallet.zip");
        if(fs.existsSync(fname))
        {
            var fname2 = GetDataPath("Update/wallet-" + Data.VersionNum + ".zip");
            if(fs.existsSync(fname2))
            {
                fs.unlinkSync(fname2)
            }
            
            var data = fs.readFileSync(fname);
            var Hash = shaarr(data);
            
            var file_handle = fs.openSync(fname2, "w");
            fs.writeSync(file_handle, data, 0, data.length)
            fs.closeSync(file_handle)
            
            var SignArr = arr2(Hash, GetArrFromValue(Data.VersionNum));
            var Sign = secp256k1.sign(SHA3BUF(SignArr), PrivateKey).signature;
            global.CODE_VERSION = Data
            global.CODE_VERSION.Hash = Hash
            global.CODE_VERSION.Sign = Sign
            return "OK Set new code version=" + Data.VersionNum;
        }
        else
        {
            return "File not exist: " + fname;
        }
    }
    StartGetNewCode(Node, VersionNum)
    {
        var Context = {"VersionNum":VersionNum};
        this.SendF(Node, {"Method":"GETCODE", "Context":Context, "Data":VersionNum})
    }
    static
    GETCODE_F()
    {
        return "uint";
    }
    RETCODE(Info)
    {
        
        var VersionNum = Info.Context.VersionNum;
        if(!VersionNum || !START_LOAD_CODE.StartLoad)
            return;
        
        if(!this.DownloadingNewCodeToPath(Info.Node, Info.Data, VersionNum))
            this.AddCheckErrCount(Info.Node, 1, "Error check hash of version code")
    }
};
