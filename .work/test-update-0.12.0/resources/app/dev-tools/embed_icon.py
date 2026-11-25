"""Developer packaging utility: replace PE icon resources without touching code.
Requires lief and pefile. The GUI application itself does not run this script.
"""
import sys,struct,hashlib
from pathlib import Path
import lief,pefile

def embed(exe_path,ico_path):
 exe_path=Path(exe_path);raw=Path(ico_path).read_bytes();count=struct.unpack_from('<H',raw,4)[0];entries={}
 for i in range(count):
  entry=raw[6+i*16:22+i*16];w,h,colors,res,planes,bits,size,offset=struct.unpack('<BBBBHHII',entry);payload=raw[offset:offset+size];one=struct.pack('<HHH',0,1,1)+struct.pack('<BBBBHHII',w,h,colors,res,planes,bits,size,22)+payload;entries[w or 256]=one
 before=pefile.PE(str(exe_path));entrypoint=before.OPTIONAL_HEADER.AddressOfEntryPoint;imports=before.get_imphash();text=next(s.get_data() for s in before.sections if s.Name.rstrip(b'\0')==b'.text');text_hash=hashlib.sha256(text).digest();text_section=next(s for s in before.sections if s.Name.rstrip(b'\0')==b'.text');virtual_size=text_section.Misc_VirtualSize;text_code_hash=hashlib.sha256(text[:virtual_size]).digest();text_padding=text[virtual_size:];before.close();del before,text,text_section
 pe=lief.PE.parse(exe_path);manager=pe.resources_manager;old_icons=list(manager.icons)
 for old in old_icons:
  width=old.width or 256;replacement=lief.PE.ResourceIcon.from_serialization(entries[width]);assert isinstance(replacement,lief.PE.ResourceIcon);replacement.id=old.id;replacement.lang=old.lang;replacement.sublang=old.sublang;manager.change_icon(old,replacement)
 pe.optional_header.checksum=0;cert=next(d for d in pe.data_directories if 'CERTIFICATE_TABLE' in str(d.type));cert.rva=0;cert.size=0
 cfg=lief.PE.Builder.config_t();cfg.resources=True;cfg.imports=False;cfg.exports=False;cfg.load_configuration=False;cfg.tls=False;cfg.relocations=False;cfg.debug=False;cfg.overlay=False
 tmp=exe_path.with_suffix('.icon-tmp.exe');pe.write(tmp,cfg);del pe,manager,old_icons
 after=pefile.PE(str(tmp));assert after.OPTIONAL_HEADER.AddressOfEntryPoint==entrypoint;assert after.get_imphash()==imports
 section=next(s for s in after.sections if s.Name.rstrip(b'\0')==b'.text');assert section.Misc_VirtualSize==virtual_size;assert hashlib.sha256(section.get_data()[:virtual_size]).digest()==text_code_hash
 # LIEF zeroes alignment padding outside the mapped .text size. Preserve the
 # vendor's padding too, so the entire original code section stays identical.
 padding_offset=section.PointerToRawData+virtual_size;after.close();del after,section
 with tmp.open('r+b') as f:f.seek(padding_offset);f.write(text_padding)
 after=pefile.PE(str(tmp));assert hashlib.sha256(next(s.get_data() for s in after.sections if s.Name.rstrip(b'\0')==b'.text')).digest()==text_hash;assert after.OPTIONAL_HEADER.DATA_DIRECTORY[2].VirtualAddress;after.close();del after

 check=lief.PE.parse(tmp);icons=list(check.resources_manager.icons);assert sorted(i.width or 256 for i in icons)==[16,32,48,256];assert len(icons)==4;del check,icons
 tmp.replace(exe_path);print('PE icon replaced; code bytes, imports and entry point unchanged.')
if __name__=='__main__':embed(sys.argv[1],sys.argv[2])
