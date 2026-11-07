import subprocess, os, json, base64, time, select
CH=os.path.expanduser('~/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome')
class B:
    def __init__(s, w=1280,h=800, mobile=False):
        r1,w1=os.pipe(); r2,w2=os.pipe()
        s.p=subprocess.Popen([CH,'--headless=new','--no-sandbox','--remote-debugging-pipe','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist',f'--window-size={w},{h}','--user-data-dir=/tmp/chprof%d'%os.getpid(),'about:blank'],
            stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,stderr=open("/tmp/claude-1000/cherr","w"),
            pass_fds=(3,4),preexec_fn=lambda:(os.dup2(r1,3),os.dup2(w2,4)))
        os.close(r1); os.close(w2)
        s.w=os.fdopen(w1,'wb',0); s.r=os.fdopen(r2,'rb',0); s.id=0; s.buf=b''; s.ev=[]
        t=s.send('Target.createTarget',{'url':'about:blank'})['targetId']
        s.sess=s.send('Target.attachToTarget',{'targetId':t,'flatten':True})['sessionId']
        s.cmd('Page.enable'); s.cmd('Runtime.enable'); s.cmd('Log.enable')
        s.size(w,h,mobile)
    def size(s,w,h,mobile=False):
        s.cmd('Emulation.setDeviceMetricsOverride',{'width':w,'height':h,'deviceScaleFactor':1,'mobile':mobile})
    def _read(s,timeout):
        while True:
            i=s.buf.find(b'\0')
            if i>=0:
                m=json.loads(s.buf[:i]); s.buf=s.buf[i+1:]; return m
            rr,_,_=select.select([s.r],[],[],timeout)
            if not rr: return None
            s.buf+=os.read(s.r.fileno(),1<<20)
    def send(s,m,p=None,sess=None):
        s.id+=1; d={'id':s.id,'method':m,'params':p or {}}
        if sess: d['sessionId']=sess
        s.w.write(json.dumps(d).encode()+b'\0')
        while True:
            r=s._read(120)
            if r is None: raise Exception('timeout '+m)
            if r.get('id')==s.id:
                if 'error' in r: raise Exception(str(r['error']))
                return r.get('result',{})
            s.ev.append(r)
    def cmd(s,m,p=None): return s.send(m,p,s.sess)
    def go(s,url,wait=2.5):
        s.cmd('Page.navigate',{'url':'about:blank'}); s.pump(0.3)
        s.cmd('Page.navigate',{'url':url}); s.pump(wait)
    def pump(s,t):
        end=time.time()+t
        while time.time()<end:
            r=s._read(0.1)
            if r: s.ev.append(r)
    def js(s,e):
        r=s.cmd('Runtime.evaluate',{'expression':e,'returnByValue':True,'awaitPromise':True})
        return r.get('result',{}).get('value')
    def shot(s,path,clip=None):
        pr={'format':'png'}
        if clip: pr['clip']=dict(x=clip[0],y=clip[1],width=clip[2],height=clip[3],scale=clip[4])
        r=s.cmd('Page.captureScreenshot',pr)
        open(path,'wb').write(base64.b64decode(r['data']))
    def console(s):
        out=[]
        for e in s.ev:
            if e.get('method')=='Runtime.consoleAPICalled' and e['params']['type'] in('error','warning'):
                out.append(('console.'+e['params']['type'],str(e['params']['args'])[:300]))
            if e.get('method')=='Runtime.exceptionThrown': out.append(('exception',str(e['params'])[:400]))
            if e.get('method')=='Log.entryAdded' and e['params']['entry']['level'] in('error','warning'): out.append(('log',e['params']['entry']['text']+' '+e['params']['entry'].get('url','')))
        return out
    def close(s):
        try: s.send('Browser.close')
        except Exception: pass
        s.p.kill()
