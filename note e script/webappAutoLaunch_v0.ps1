$url = "http://192.168.19.111:1880/webapp/"
#$url = "http://192.168.19.111:1880/ui/"
$chromeExePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$delay = 12
$result = ""

do{
    try {
        Write-Output "verifica connessione a $url"
        $result = Invoke-RestMethod $url -ErrorAction Stop -TimeoutSec ($delay*2/3) -Headers @{"Cache-Control"="no-cache"}
    }
    catch{
       write-warning "Nessuna risposta.. (failed REST request)"
    }
    #Invoke-RestMethod immediately returns on some connection errors #this prevents too fast infinite loops
    Timeout /T ($delay/3)
    write-output "result:$result"
    write-warning $result.GetType()
}while(-not $result)
clear-host
write-output "attesa"
start-sleep -Seconds 5
write-output "avvia webapp"
Start-Process $chromeExePath -ArgumentList "--start-fullscreen $url"

