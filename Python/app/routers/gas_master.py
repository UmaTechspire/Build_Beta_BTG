from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy import text
from ..database import engine 
import os
from dotenv import load_dotenv

load_dotenv()

DB_NAME_USER = os.getenv('DB_NAME_USER', 'btggasify_live')

router = APIRouter()

# --- Models ---
class GasCodeRequest(BaseModel):
    Id: Optional[int] = 0
    GasCode: str
    GasName: str
    Volume: str
    Pressure: str
    VolumeId: Optional[int] = 0
    PressureId: Optional[int] = 0
    GasTypeId: int
    test: Optional[int] = 0
    OrgId: int = 1
    BranchId: int = 1
    Descriptions: Optional[str] = ""
    IsActive: bool = True
    UserId: Optional[int] = 1 # Added for CreatedBy/LastModifiedBy
    UserIp: Optional[str] = ""

class ToggleStatusRequest(BaseModel):
    id: int
    isActive: bool

# --- Endpoints ---

@router.get("/GetAllGasListing")
async def get_all_gas_listing(gasName: str = "", volume: str = "", pressure: str = ""):
    try:
        async with engine.connect() as conn:
            # Construct query dynamically based on logic in C# proc
            # C# proc likely filters by LIKE %...% if param is not empty
            
            sql = f"""
                SELECT 
                    g.Id,
                    g.GasCode,
                    g.GasName,
                    g.Volume,
                    g.Pressure,
                    g.VolumeId,
                    g.PressureId,
                    g.GasTypeId,
                    g.Descriptions,
                    g.Descriptions,
                    CAST(g.IsActive AS UNSIGNED) as IsActive,
                    gt.TypeName as GasTypeName
                FROM {DB_NAME_USER}.master_gascode g
                LEFT JOIN {DB_NAME_USER}.master_gastypes gt ON g.GasTypeId = gt.Id
                WHERE 1=1
            """
            
            params = {}
            if gasName:
                sql += " AND g.GasName LIKE :gasName"
                params["gasName"] = f"%{gasName}%"
            if volume:
                sql += " AND g.Volume LIKE :volume"
                params["volume"] = f"%{volume}%"
            if pressure:
                sql += " AND g.Pressure LIKE :pressure"
                params["pressure"] = f"%{pressure}%"
                
            sql += " ORDER BY g.GasName ASC"
            
            result = await conn.execute(text(sql), params)
            rows = result.fetchall()
            
            # Reformat to match what Frontend expects (if C# returns a specific structure)
            # Frontend seems to expect a list of objects.
            return {"status": True, "data": [dict(row._mapping) for row in rows]}

    except Exception as e:
        print(f"Error fetching gas listing: {e}")
        return {"status": False, "message": str(e), "data": []}

@router.get("/GetByID")
async def get_by_id(gasID: int):
    try:
        async with engine.connect() as conn:
            sql = text(f"""
                SELECT * FROM {DB_NAME_USER}.master_gascode WHERE Id = :id
            """)
            result = await conn.execute(sql, {"id": gasID})
            row = result.fetchone()
            
            if row:
                return {"status": True, "data": [dict(row._mapping)], "message": "Success"}
            else:
                return {"status": False, "message": "Gas code not found", "data": []}
    except Exception as e:
         return {"status": False, "message": str(e), "data": []}

@router.post("/Create")
async def create_gas(payload: GasCodeRequest):
    try:
        async with engine.begin() as conn:
            sql = text(f"""
                INSERT INTO {DB_NAME_USER}.master_gascode 
                (GasCode, GasName, Volume, Pressure, CreatedBy, CreatedDate, CreatedIP, IsActive, OrgId, BranchId, Descriptions, GasTypeId, VolumeId, PressureId)
                VALUES 
                (:code, :name, :vol, :press, :user, NOW(), :ip, :active, :org, :branch, :desc, :type, :volid, :pressid)
            """)
            
            await conn.execute(sql, {
                "code": payload.GasCode,
                "name": payload.GasName,
                "vol": payload.Volume,
                "press": payload.Pressure,
                "user": payload.UserId,
                "ip": payload.UserIp,
                "active": 1 if payload.IsActive else 0,
                "org": payload.OrgId,
                "branch": payload.BranchId,
                "desc": payload.Descriptions,
                "type": payload.GasTypeId,
                "volid": payload.VolumeId,
                "pressid": payload.PressureId
            })
            
            return {"status": True, "message": "Saved Successfully"}
            
    except Exception as e:
        print(f"Error creating gas: {e}")
        return {"status": False, "message": f"Saving MasterGas failed: {str(e)}"}

@router.put("/Update")
async def update_gas(payload: GasCodeRequest):
    try:
        async with engine.begin() as conn:
             sql = text(f"""
                UPDATE {DB_NAME_USER}.master_gascode
                SET 
                    GasCode = :code,
                    GasName = :name,
                    Volume = :vol,
                    Pressure = :press,
                    LastModifiedBy = :user,
                    LastModifiedDate = NOW(),
                    LastModifiedIP = :ip,
                    IsActive = :active,
                    OrgId = :org,
                    BranchId = :branch,
                    Descriptions = :desc,
                    GasTypeId = :type,
                    VolumeId = :volid,
                    PressureId = :pressid
                WHERE Id = :id
            """)
             
             result = await conn.execute(sql, {
                "code": payload.GasCode,
                "name": payload.GasName,
                "vol": payload.Volume,
                "press": payload.Pressure,
                "user": payload.UserId,
                "ip": payload.UserIp,
                "active": 1 if payload.IsActive else 0,
                "org": payload.OrgId,
                "branch": payload.BranchId,
                "desc": payload.Descriptions,
                "type": payload.GasTypeId,
                "volid": payload.VolumeId,
                "pressid": payload.PressureId,
                "id": payload.Id
            })
             
             if result.rowcount == 0:
                 return {"status": False, "message": "Update failed: Record not found"}
                 
             return {"status": True, "message": "Updated Successfully"}

    except Exception as e:
        return {"status": False, "message": f"Update failed: {str(e)}"}

@router.put("/ToogleActiveStatus")
async def toggle_active_status(payload: ToggleStatusRequest):
    print(f"Toggle Request: {payload}")
    try:
        async with engine.begin() as conn:
            sql = text(f"""
                UPDATE {DB_NAME_USER}.master_gascode
                SET IsActive = :active
                WHERE Id = :id
            """)
            
            # Convert bool to int for BIT(1) column
            active_val = 1 if payload.isActive else 0
            
            result = await conn.execute(sql, {"active": active_val, "id": payload.id})
            print(f"Toggle Result: rows={result.rowcount}")
            
            if result.rowcount == 0:
                 return {"status": False, "message": "Toggle failed: Record not found"}
            
            return {"status": True, "message": "Toogle status MasterGas success"}
            
    except Exception as e:
        print(f"Toggle Error: {e}")
        return {"status": False, "message": f"Toggle failed: {str(e)}"}

@router.get("/GetAllGasTypes")
async def get_all_gas_types():
    try:
        async with engine.connect() as conn:
            sql = text(f"SELECT Id, TypeName FROM {DB_NAME_USER}.master_gastypes WHERE IsActive = 1 ORDER BY TypeName")
            result = await conn.execute(sql)
            rows = result.fetchall()
            return {"status": True, "data": [dict(row._mapping) for row in rows]}
    except Exception as e:
        return {"status": False, "message": str(e), "data": []}