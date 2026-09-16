from fastapi import FastAPI
try:
    from server import app
except Exception as e:
    import traceback
    traceback.print_exc()
    app = FastAPI()
    @app.get("/")
    def root():
        return {"message":"backend loaded (server import failed)","error":str(e)}
