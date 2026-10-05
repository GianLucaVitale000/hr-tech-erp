<?php

namespace App\Http\Controllers;

use App\Models\Dipendente;
use App\Models\PrivacyAcknowledgment;
use Illuminate\Http\Request;

class PrivacyAcknowledgmentController extends Controller
{
    public function index(Dipendente $dipendente)
    {
        abort_unless(request()->user()->hasRole('admin'), 403);

        return PrivacyAcknowledgment::with('recorder:id,name')
            ->where('dipendente_id', $dipendente->id)
            ->latest()
            ->get();
    }

    public function store(Request $request, Dipendente $dipendente)
    {
        abort_unless($request->user()->hasRole('admin'), 403);

        $validated = $request->validate([
            'document_version' => 'required|string|max:50',
            'document_date' => 'required|date',
            'acknowledged_at' => 'required|date',
            'archive_method' => 'required|in:external_signed_document',
            'archive_reference' => 'required|string|max:255',
            'notes' => 'nullable|string|max:5000',
            'admin_confirmation' => 'accepted',
        ]);

        unset($validated['admin_confirmation']);

        return response()->json(
            PrivacyAcknowledgment::create([
                ...$validated,
                'document_type' => 'privacy_notice',
                'dipendente_id' => $dipendente->id,
                'recorded_by' => $request->user()->id,
            ])->load('recorder:id,name'),
            201
        );
    }
}
