!include "nsDialogs.nsh"
!include "LogicLib.nsh"

Var Dialog
Var Label
Var RadioServer
Var RadioClient
Var SelectedRole

!macro customHeader
  Page custom PageRoleSelection PageRoleSelectionLeave
!macroend

Function PageRoleSelection
  nsDialogs::Create 1018
  Pop $Dialog
  ${If} $Dialog == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 24u "Оберіть тип встановлення програми SADOK:$\r$\nГоловний комп'ютер - зберігає базу даних.$\r$\nКлієнт - підключається до головного по мережі."
  Pop $Label

  ${NSD_CreateRadioButton} 0 30u 100% 10u "Головний комп'ютер (Сервер + База даних)"
  Pop $RadioServer
  ${NSD_SetState} $RadioServer ${BST_CHECKED}

  ${NSD_CreateRadioButton} 0 45u 100% 10u "Комп'ютер користувача (Клієнт)"
  Pop $RadioClient

  nsDialogs::Show
FunctionEnd

Function PageRoleSelectionLeave
  ${NSD_GetState} $RadioServer $0
  ${If} $0 == ${BST_CHECKED}
    StrCpy $SelectedRole "server"
  ${Else}
    StrCpy $SelectedRole "client"
  ${EndIf}
FunctionEnd

!macro customInstall
  CreateDirectory "$APPDATA\SADOK"
  FileOpen $0 "$APPDATA\SADOK\desktop-config.json" w
  ${If} $SelectedRole == "server"
    FileWrite $0 "{$\"role$\":$\"server$\",$\"serverUrl$\":$\"http://127.0.0.1:3000$\"}"
  ${Else}
    FileWrite $0 "{$\"role$\":$\"client$\",$\"serverUrl$\":$\"$\"}"
  ${EndIf}
  FileClose $0
!macroend
