Option Explicit

Dim shell, fso, scriptDir, psScript, command
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
psScript = scriptDir & "\start-desktop.ps1"
command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & psScript & """"

' Run hidden and do not block the caller.
shell.Run command, 0, False
