from fastapi import APIRouter,HTTPException,Depends
from pydantic import BaseModel,Field
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from db import get_db
from models import Student
