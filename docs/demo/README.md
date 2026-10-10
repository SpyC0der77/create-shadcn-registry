# Record the terminal demo

Install VHS, ttyd and FFmpeg, and ensure Node.js, Git and the repo npm dependencies are on PATH or installed in the active environment. On Windows, run from the repository root:

```powershell
vhs docs/demo/demo.tape
```

The preparation script copies the real source and demo fixtures into a fresh temporary directory. Generated files stay there. The recording is written to `docs/images/cli-demo.gif`. No development server is started.
