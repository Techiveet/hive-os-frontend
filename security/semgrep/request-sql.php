<?php
namespace HiveSecurityRuleFixtures;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
function unsafe(Request $request): void {
    // ruleid: request-data-in-unparameterized-sql
    DB::statement($request->input('sql'));
}
function boundValue(Request $request): void {
    // ok: request-data-in-unparameterized-sql
    DB::statement('SELECT * FROM records WHERE name = ?', [$request->input('name')]);
    // ok: request-data-in-unparameterized-sql
    DB::table('records')->where('name', $request->input('name'))->whereRaw('active = 1');
}
