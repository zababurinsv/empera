/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2019 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

var fs = require('fs');
function CheckSizeLogFile(file_name,file_name_prev)
{
    "use strict";
    let FILE_NAME_LOG = file_name;
    let FILE_NAME_LOG_PREV = file_name_prev;
    setInterval(function ()
    {
        try
        {
            var stat = fs.statSync(FILE_NAME_LOG);
            if(stat.size > MAX_SIZE_LOG)
            {
                if(fs.existsSync(FILE_NAME_LOG_PREV))
                {
                    fs.unlinkSync(FILE_NAME_LOG_PREV);
                }
                fs.renameSync(FILE_NAME_LOG, FILE_NAME_LOG_PREV);
                ToLog("truncate logfile ok");
            }
        }
        catch(err)
        {
        }
    }, 60000);
}
global.CheckSizeLogFile = CheckSizeLogFile;
