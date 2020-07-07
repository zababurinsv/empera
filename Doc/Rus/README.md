# TERA PLATFORM


* Что это за проект и что он делает мы рекомендуем почитать в обзорной статье: [Децентрализованные приложения на платформе TERA](https://medium.com/@evkara777/%D0%B4%D0%B5%D1%86%D0%B5%D0%BD%D1%82%D1%80%D0%B0%D0%BB%D0%B8%D0%B7%D0%BE%D0%B2%D0%B0%D0%BD%D0%BD%D1%8B%D0%B5-%D0%BF%D1%80%D0%B8%D0%BB%D0%BE%D0%B6%D0%B5%D0%BD%D0%B8%D1%8F-%D0%BD%D0%B0-%D0%BF%D0%BB%D0%B0%D1%82%D1%84%D0%BE%D1%80%D0%BC%D0%B5-tera-5a168158cabc)
* Ниже описывается как его установить на ваш компьютер


## Легкий кошелек (веб-версия):
https://terawallet.org
* Примечание: легкий кошелек имеет децентрализованное ядро - т.е. работает со всеми доступными нодами в сети

## Установка легкого кошелька на Windows:
* https://gitlab.com/terafoundation/terarun/raw/master/Bin/Light/tera_light_setup.exe
* [Light client (zip)](https://gitlab.com/terafoundation/terarun/raw/master/Bin/Light/Tera-light.zip)

## Установка полной ноды из установщика для Windows
https://gitlab.com/terafoundation/terarun/raw/master/Bin/Full/tera_full_setup.exe

## Установка полной ноды из исходников по шагам:


Внимание:
* Для быстрой начальной загрузки кошелька выложена [ссылка](https://sourceforge.net/p/tera/code/ci/master/tree/Torrent/Tera-folder-DB.torrent?format=raw) на загрузку базы данных по P2P протоколу. Скачайте через торрент файл и распакуйте его. Далее положите папку DB в каталог DATA кошелька (с полной заменой).
* После установки, указанной ниже, введите в браузере публичный адрес вашего сервера, например: 12.34.56.78:8080
* Для майнинга Вам нужно иметь статический (или публичный) IP-адрес и открытый порт.
* Не храните приватные ключи на удаленных серверах.
* Рекомендуем поставить дополнительный пароль на приватный ключ (кнопка "Set password")  - в этом случае приватный ключ будет храниться в файле кошелька в зашифрованном виде.
* Если вы не указали http пароль для полной ноды, то возможен только доступ с локального адреса 127.0.0.1:8080 и только в течении 10 минут после запуска ноды
* Установите удаленный доступ к ноде только из списка белых IP через константу HTTP_IP_CONNECT (например: "HTTP_IP_CONNECT":"122.22.33.11, 122.22.33.12")
* При установке обратите внимание на криптографическую библиотеку **secp256k1**. При ее компиляции (командной npm install) не должно быть ошибок.



## Установка на Windows:

1. Скачайте и установите Nodejs https://nodejs.org  (рекомендуется версия v8.11)
2. Скачайте и установите git https://git-scm.com/download/win
3. Далее выполните команды (для этого запустите программу cmd или PowerShell):
```
cd ..\..\..\
git clone https://gitlab.com/terafoundation/tera.git wallet
npm install --global --production windows-build-tools
npm install -g node-gyp
cd wallet/Source
npm install
node set httpport:8080 password:<секретное слово без пробела>
run-node.bat

```
Если вы хотите запускать кошелек в качестве фонового процесса, то вместо последней команды (run-node.bat) выполните следующие:
```
npm install pm2 -g
pm2 start run-node.js
```

### Открытие портов (для майнинга):
```
netsh advfirewall firewall add rule name="Open 30000 port" protocol=TCP localport=30000 action=allow dir=IN
```







## Установка на Linux 

Просто введите подряд в ssh-терминал команды указанные ниже (в зависимости от версии дистрибутива)



### Дистрибутив CentOS 7:

```
yum install -y git
curl --silent --location https://rpm.nodesource.com/setup_8.x | sudo bash -
yum  install -y nodejs
yum install gcc gcc-c++
npm install pm2 -g
git clone https://gitlab.com/terafoundation/tera.git wallet
cd wallet/Source
npm install
node set httpport:8080 password:<секретное слово без пробела>
pm2 start run-node.js
```

### открытие всех портов:
```
systemctl stop firewalld 
systemctl disable firewalld
```


### Дистрибутив UBUNTU 18.4:

```
apt-get install -y git
apt-get install -y nodejs
apt-get install -y npm
npm install pm2 -g
git clone https://gitlab.com/terafoundation/tera.git wallet
apt install build-essential
apt group install "Development Tools"
cd wallet/Source
npm install
node set httpport:8080 password:<секретное слово без пробела>
pm2 start run-node.js
```

### открытие портов:
```
sudo ufw allow 30000/tcp
sudo ufw allow 8080/tcp
```

### Дистрибутив UBUNTU 16 перед загрузкой ноды выполнить:
```
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
```




## MAIN NETWORK
Значения по умолчанию:
```
port:30000
httpport:8080
```


## TEST NETWORK
Значения по умолчанию:
```
port:33000
httpport:8800
```
Запуск: 
```
cp -a Source SourceJinn
cd SourceJinn
node set-jinn httpport:8800 password:<SecretWord>
pm2 start run-jinn.js
```


## Обновления

```
cd wallet
cd Source
node update.js
```



## Спецификация
* Название: TERA
* Консенсус: PoW
* Алгоритм:  Terahash (sha3 + оптимизация на использование памяти)
* Максимальная эмиссия: 1 млрд (TER)
* Вознаграждение за блок: около 3 Тера (одна миллиардная часть остатка нераспределенной суммы монет счета 0 умножается на 9)
* Премайн: 5%
* Фонд разработки: 1% от майнинга
* Время генерации блока: 1 секунда
* Время подтверждения блока: 8 секунд
* Размер блока: 300 Кбайт
* Скорость: 1000 транзакций в секунду
* Комиссия в транзакциях: бесплатно
* Криптография: sha3, secp256k1
* Платформа: Node.JS
* Язык смарт-контрактов: Javascript




## КОШЕЛЕК
### Запуск кошелька
Дождитесь окончания синхронизации - должна появиться зеленая надпись Synchronization complete
Для майнинга нужно создать счет, после записи в блокчейн укажите этот номер (ID) в настройках SET MINING.
* Примечание: нужно иметь статический IP-адрес и открытый порт 30000 (его можно поменять в программе). Если вы имеете несколько нод на одном ip-адресе, то поставьте для них разные порты (30001,30002 и т.д.)

Кошелек имеет два режима ввода ключа. Приватный и публичный. Публичный нужен для работы кошелька в режиме просмотра и отправки уже подписанных транзакций (например через флешку с другого компьютера, который не подключен к сети)




## Эмиссия
Максимальная эмиссия: 1 млрд (TER)
Награда за блок: 1-20 монет, зависит от мощности сети (одна миллиардная часть от остатка нераспределенной суммы монет и умноженная на сотую часть квадрата логарифма мощности сети)

В первый год работы сети (когда номер блока находится в диапазоне от 2 млн до 30 млн) работает реферальная программа майнинга. Если майнер указал адвайзера в своем кошельке, то он получает примерно двукратный размер награды, а его адвайзер получает однократную награду. Таким образом при начале действии реферальной программы эмиссия примерно утраивается.
Технически адвайзер это номер счета, любой счет может стать адвайзером, при условии что он был создан более 1 млн блоков назад (т.е. примерно 12 дней).
В целях сглаживания кривой эмиссии, сумма награды за реферальный майнинг умножается на коэффициент, принимающий значение от 1 до 0. Коэффициент принимает значение равное 1 в начале запуска программы и плавно меняется до 0 к концу действия программы (до 30 млн-го блока).

### Пример расчета эмиссии монет:
Допустим сейчас мощность сети равняется 30 битам в хеше блока, а всего нераспределенных монет 1 млрд и мы находимся в самом начале действия программы майнинга, тогда одна награда равняется 900/100=9 монет.
Монеты распределяются следующим образом: 2 награды майнеру, 1 награда адвайзеру, а всего будет списано с системного  счета  27 монет (3x9 = 27).
В случае, когда мы находимся в середине реферальной программы майнинга, когда коэффициент равен 0.5, эмиссия принимает следующие значения в приведенном выше примере: 1.5 награды майнеру, 0.5 награда адвайзеру, а всего будет списано с системного  счета  18 монет (2x9 = 18).



## Описание принципа хранения монет
Монеты хранятся на счетах, по аналогии с банковскими счетами. Счета нумеруются с 0 по порядку. Нулевой номер счета имеет системный аккаунт, на который первоначально эмитировано 1 млрд монет. Для создания нового счета нужно в сеть отправить спец. транзакцию с кодом 100, в которой указывается публичный ключ владельца счета и необязательный параметр название счета (строка до 40 байт длины). Название желательно для проверки правильности ввода номера счета при отправке платежа.


## Майнинг возможен только при наличии публичного IP:
* Проверьте наличие прямого ip-адреса (закажите  у провайдера)
* Проверьте firewall (открыт ли порт на компьютере)




# Ссылки:
* Веб-сайт: http://terafoundation.org
* Btt: https://bitcointalk.org/index.php?topic=4573801.0
* Twitter: https://twitter.com/terafoundation
* Telegram: https://t.me/terafoundation
* Discord [RUS]: https://discord.gg/dzSGKyR
* [Ютуб-канал](https://www.youtube.com/channel/UCGQeUCUKZgH0DfbakD7gjqQ)
* [Документация по смарт-контрактам на русском](https://docs.google.com/document/d/1SkD4yc_POaGRMJRC6yGkDfdJUuKbcyq3JpG0cBXeYGM/edit?usp=sharing)
* [Руководство по созданию ордеров на Tera DEX](https://docs.google.com/document/d/1rWGOrx9gabsu866zqJ2so6Mp0WUGh9t0BIWjz4kAIBw/edit?usp=sharing)
* [Токен BTC для торговли на Tera DEX](https://docs.google.com/document/d/1ERPdSizarqYzwb5AA4R8mfUVFnSc-Amm7xCg3q4zUhA/edit?usp=sharing)
* [Техническое WP - черновик](https://docs.google.com/document/d/1B6_qlAp2xs4aHkqOwyvRMCDJTjgeNiOJiGpIeT0VAzY/edit?usp=sharing)
* [Торрент блокчейна (каталог DATA/DB)](https://sourceforge.net/p/tera/code/ci/master/tree/Torrent/Tera-folder-DB.torrent?format=raw)
* [API](https://gitlab.com/terafoundation/tera/blob/master/Doc/Rus/API.md)
* [API-2](https://gitlab.com/terafoundation/tera/blob/master/Doc/Rus/API2.md)
* [CONSTANTS](https://gitlab.com/terafoundation/tera/blob/master/Doc/Rus/CONSTANTS.MD)
* [Презентация - Проблематика блокчейна и пути решения](https://docs.google.com/presentation/d/1NvaGQTUpeP3y7CmHpaqFmaqWlCEMMoPdvCyylFVJ3lk/edit?usp=sharing)

## Блокчейн:
* [Веб-Кошелек](https://terawallet.org)
* [Эксплорер](https://teraexplorer.org)


Статьи:
* [Децентрализованные приложения на платформе TERA](https://medium.com/@evkara777/%D0%B4%D0%B5%D1%86%D0%B5%D0%BD%D1%82%D1%80%D0%B0%D0%BB%D0%B8%D0%B7%D0%BE%D0%B2%D0%B0%D0%BD%D0%BD%D1%8B%D0%B5-%D0%BF%D1%80%D0%B8%D0%BB%D0%BE%D0%B6%D0%B5%D0%BD%D0%B8%D1%8F-%D0%BD%D0%B0-%D0%BF%D0%BB%D0%B0%D1%82%D1%84%D0%BE%D1%80%D0%BC%D0%B5-tera-5a168158cabc)
* [TERA и современные проблемы блокчейна](https://golos.io/ru--blokcheijn/@funnyprofit/tera-i-sovremennye-problemy-blokcheina)
* [ТЕРА: инновационные решения блокчейна](https://medium.com/@evkara777/%D1%82%D0%B5%D1%80%D0%B0-%D0%B8%D0%BD%D0%BD%D0%BE%D0%B2%D0%B0%D1%86%D0%B8%D0%BE%D0%BD%D0%BD%D1%8B%D0%B5-%D1%80%D0%B5%D1%88%D0%B5%D0%BD%D0%B8%D1%8F-%D0%B1%D0%BB%D0%BE%D0%BA%D1%87%D0%B5%D0%B9%D0%BD%D0%B0-486139d56520?sk=0573d607b0c2130c016d9797130c44dd)


Топики на btt:
* [Давайте создадим идеальную криптовалюту](https://bitcointalk.org/index.php?topic=2574634.msg26224253#msg26224253)
* [Алгоритм дистрибуции монет блокчейна](https://bitcointalk.org/index.php?topic=3645579.msg36671591#msg36671591)
* [Мгновенные платежи](https://bitcointalk.org/index.php?topic=3873263.msg37478379#msg37478379)
* [Блокчейн-торговля (опираясь на теорию игр)](https://bitcointalk.org/index.php?topic=4711054.msg42534962#msg42534962)
* [Алгоритм с защитой от GPU-майнинга - TeraHash](https://bitcointalk.org/index.php?topic=5023773.msg45334091#msg45334091)
* [Смарт-контракты на javascript](https://bitcointalk.org/index.php?topic=5067286.msg47792347#msg47792347)

