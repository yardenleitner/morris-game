# Runs the Next.js server inside a Windows job object flagged kill-on-close.
#
# Closing the console window kills this PowerShell process, which closes the last
# handle to the job, and Windows then terminates every process inside it - the node
# server and any worker it spawned. That is what makes "close the terminal" a
# reliable stop. Without it, a closed window can leave port 3000 held by an orphaned
# node process still serving yesterday's build.

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class KillOnCloseJob
{
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern IntPtr CreateJobObject(IntPtr attributes, string name);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool SetInformationJobObject(IntPtr job, int infoClass, IntPtr info, uint length);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);

    [StructLayout(LayoutKind.Sequential)]
    struct JOBOBJECT_BASIC_LIMIT_INFORMATION
    {
        public long PerProcessUserTimeLimit;
        public long PerJobUserTimeLimit;
        public uint LimitFlags;
        public UIntPtr MinimumWorkingSetSize;
        public UIntPtr MaximumWorkingSetSize;
        public uint ActiveProcessLimit;
        public UIntPtr Affinity;
        public uint PriorityClass;
        public uint SchedulingClass;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct IO_COUNTERS
    {
        public ulong ReadOperationCount, WriteOperationCount, OtherOperationCount;
        public ulong ReadTransferCount, WriteTransferCount, OtherTransferCount;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION
    {
        public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
        public IO_COUNTERS IoInfo;
        public UIntPtr ProcessMemoryLimit;
        public UIntPtr JobMemoryLimit;
        public UIntPtr PeakProcessMemoryUsed;
        public UIntPtr PeakJobMemoryUsed;
    }

    const int ExtendedLimitInformation = 9;
    const uint KillOnJobClose = 0x2000;

    // The handle is deliberately never closed: it has to stay open for the life of
    // this process, because closing it is exactly what kills the children.
    public static IntPtr Create()
    {
        IntPtr job = CreateJobObject(IntPtr.Zero, null);
        if (job == IntPtr.Zero) throw new Exception("CreateJobObject failed: " + Marshal.GetLastWin32Error());

        var info = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
        info.BasicLimitInformation.LimitFlags = KillOnJobClose;

        int size = Marshal.SizeOf(info);
        IntPtr buffer = Marshal.AllocHGlobal(size);
        try
        {
            Marshal.StructureToPtr(info, buffer, false);
            if (!SetInformationJobObject(job, ExtendedLimitInformation, buffer, (uint)size))
                throw new Exception("SetInformationJobObject failed: " + Marshal.GetLastWin32Error());
        }
        finally { Marshal.FreeHGlobal(buffer); }
        return job;
    }

    public static void Add(IntPtr job, IntPtr process)
    {
        if (!AssignProcessToJobObject(job, process))
            throw new Exception("AssignProcessToJobObject failed: " + Marshal.GetLastWin32Error());
    }
}
'@

$job = [KillOnCloseJob]::Create()

$next = Join-Path $root 'node_modules\next\dist\bin\next'
$server = Start-Process -FilePath 'node.exe' -ArgumentList @($next, 'start') -WorkingDirectory $root -NoNewWindow -PassThru
[KillOnCloseJob]::Add($job, $server.Handle)

# Ctrl+C lands in the finally; a closed window never gets here and the job does it.
try { $server.WaitForExit() } finally { if (-not $server.HasExited) { $server.Kill() } }
