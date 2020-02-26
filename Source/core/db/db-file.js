/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/


const fs = require('fs');



module.exports = class CDBItem extends require("./db")
{
    constructor(FileName, bReadOnly)
    {
        super()
        
        this.FileName = FileName
        var FileItem = this.OpenDBFile(this.FileName, !bReadOnly);
        this.FileNameFull = FileItem.fname
    }
    
    Write(BufWrite, Position, CheckSize)
    {
        var FI = this.OpenDBFile(this.FileName, 1);
        if(!Position)
        {
            if(!FI.size)
                FI.size = 100
            Position = FI.size
        }
        
        var written = fs.writeSync(FI.fd, BufWrite, 0, BufWrite.length, Position);
        if(written !== BufWrite.length)
        {
            ToLog("DB-FILE: Error write to file:" + written + " <> " + BufWrite.length)
            return false;
        }
        
        FI.size = Math.max(FI.size, Position + written)
        
        if(CheckSize && FI.size !== Position + written)
            ToLogTrace("Error FI.size = " + FI.size)
        
        return Position;
    }
    
    Read(Position, DataSize)
    {
        Position = Math.trunc(Position)
        
        var BufRead = Buffer.alloc(DataSize);
        var FI = this.OpenDBFile(this.FileName);
        var bytesRead = fs.readSync(FI.fd, BufRead, 0, BufRead.length, Position);
        if(bytesRead !== BufRead.length)
            return undefined;
        
        return BufRead;
    }
    
    Size()
    {
        var FI = this.OpenDBFile(this.FileName);
        return FI.size;
    }
    
    Truncate(Pos)
    {
        var FI = this.OpenDBFile(this.FileName, 1);
        if(FI.size !== Pos)
        {
            FI.size = Pos
            fs.ftruncateSync(FI.fd, FI.size)
        }
    }
    Close()
    {
        this.CloseDBFile(this.FileName)
    }
};
