/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


const fs = require('fs');

module.exports = class CDBItem extends require("../../core/db/db-file")
{
    constructor(FileName, DataSize, Format, bReadOnly)
    {
        super(FileName, bReadOnly)
        
        this.DataSize = DataSize
        
        if(typeof Format === "object")
            Format = SerializeLib.GetFormatFromObject(Format)
        
        this.Format = Format
        this.WorkStruct = {}
    }
    
    Write(Data)
    {
        var BufWrite = SerializeLib.GetBufferFromObject(Data, this.Format, this.WorkStruct, 1);
        
        if(this.DataSize && this.DataSize !== BufWrite.length)
        {
            ToLogTrace("Error SerializeLib")
        }
        
        var FI = this.OpenDBFile(this.FileName, 1);
        if(!Data.Position)
        {
            if(!FI.size)
                FI.size = 100
            Data.Position = FI.size
        }
        
        var written = fs.writeSync(FI.fd, BufWrite, 0, BufWrite.length, Data.Position);
        
        if(written !== BufWrite.length)
        {
            ToLog("DB-ITEM: Error write to file:" + written + " <> " + BufWrite.length)
            return false;
        }
        
        FI.size = Math.max(FI.size, Data.Position + written)
        
        return true;
    }
    
    Read(Position)
    {
        Position = Math.trunc(Position)
        
        var Data;
        var BufRead = Buffer.alloc(this.DataSize);
        var FI = this.OpenDBFile(this.FileName);
        var bytesRead = fs.readSync(FI.fd, BufRead, 0, BufRead.length, Position);
        if(bytesRead !== BufRead.length)
            return undefined;
        
        try
        {
            Data = SerializeLib.GetObjectFromBuffer(BufRead, this.Format, this.WorkStruct)
        }
        catch(e)
        {
            ToLog("DBITEM:" + e)
            return undefined;
        }
        
        Data.Position = Position
        return Data;
    }
};
