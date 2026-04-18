// import { Injectable } from "@angular/core";


// @Injectable()
// export class  AuthEffects {
//     public appConfig$ = createEffect(() => this.action$.pipe(
//         ofType(AuthActions.appConfig$)
//         switchMap(()
//         this.appExternalConfigurationService.loadExternalConfig().pipe(
//             ofTye(AuthActions.appConfig),
//             switchMap((appConfig)=> 
//             [AuthActions.appConfigSuccessResult({payload: appConfig}),
//                 AuthActions.tokenAuthenticate()
//             ])

//              )
//         ))
//     );

//     public token$ =createEffect(()=> 
//     this.actions$.pipe(
//          ofType(AuthActions.tokenAuthenticate),
//          switchMap(()-> 
//            this.authService.getToken().pipe(
//             map(profile=> AuthActions.tokenAuthenticationResult({payload: profile})),
//             catch((errror: HttpErrorResponse) => of(AuthActions.authenticationEror({payload: error.error})))
//            ))
//     ))

//     public token$ = createEffect(()=> 
//        this.actions$.pipe(
//         ofType(AuthActions.tokenAuthenticate),
//         switchMap(()=>
//            this.authService.getToken().pipe(
//               map(profile => AuthActions.tokenAuthenticationResult({payload: profile}))
//            )
//         )
//        )
//       )

//       constructor (private actions$: ActivationStart, private authService: ShellAuthService, private appExternalConfigService: AppExternalConfigService) {}

// }